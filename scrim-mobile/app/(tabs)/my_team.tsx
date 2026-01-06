import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useFocusEffect, router } from 'expo-router';

type RegionId =
  | 'pacific-nw'
  | 'pacific-sw'
  | 'central-north'
  | 'central-south'
  | 'atlantic-north'
  | 'atlantic-south';

const REGION_LABELS: Record<string, string> = {
  'pacific-nw': 'Pacific Northwest',
  'pacific-sw': 'Pacific Southwest',
  'central-north': 'Central North',
  'central-south': 'Central South',
  'atlantic-north': 'Atlantic North',
  'atlantic-south': 'Atlantic South',
};

type ProfileRow = {
  id: string;
  username: string | null;
  handle: string | null;
  primary_team_id: string | null;
  primary_region: string | null;
};

type TeamRow = {
  id: string;
  owner_id: string;
  name: string;
  tag: string | null;
  region: string | null;
  time_zone: string | null;
  created_at: string | null;
};

type TeamMemberRow = {
  id: string;
  team_id: string;
  user_id: string;
  status: string; // enum values: active, invited, pending, left, removed
  created_at: string | null;
};

type MemberUI = {
  id: string;
  name: string;
  role: string; // placeholder until you add role to schema
  status: 'online' | 'away' | 'offline'; // placeholder mapping from team_members.status
  initials: string;
};

type ScrimRow = {
  id: string;
  host_team_id: string;
  status: string;
  start_time: string;
};

function initialsFromName(name: string) {
  const clean = name.replace(/\(Owner\)/gi, '').replace('@', '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function startOfWeekLocal(d = new Date()) {
  // Monday start
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun - 6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function MyTeamScreen() {
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [teamDescription, setTeamDescription] = useState<string>(
    'Competitive CoD team. Team bio/description coming soon.'
  );
  const [members, setMembers] = useState<MemberUI[]>([]);
  const [stats, setStats] = useState({
    scrimsThisWeek: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const teamUi = useMemo(() => {
    const tag = team?.tag?.trim()
      ? team.tag.trim()
      : team?.name
        ? team.name.slice(0, 2).toUpperCase()
        : '—';

    const regionLabel = team?.region ? REGION_LABELS[team.region] ?? team.region : 'Not set';

    return {
      name: team?.name ?? 'No Team Yet',
      tag,
      region: regionLabel,
      tier: '—', // placeholder until Faceit/tier logic
      description: teamDescription,
    };
  }, [team, teamDescription]);

  const statsUi = useMemo(
    () => [
      { label: 'Scrims This Week', value: String(stats.scrimsThisWeek), color: '#3b82f6' },
      { label: 'Confirmed Scrims', value: String(stats.confirmed), color: '#10b981' },
      { label: 'Pending', value: String(stats.pending), color: '#f59e0b' },
      { label: 'Cancelled', value: String(stats.cancelled), color: '#ef4444' },
    ],
    [stats]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#10b981';
      case 'away':
        return '#f59e0b';
      case 'offline':
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

  const mapTeamMemberStatusToPresence = (s: string): MemberUI['status'] => {
    const v = (s ?? '').toLowerCase();
    if (v === 'active') return 'online';
    if (v === 'pending' || v === 'invited') return 'away';
    return 'offline';
  };

  const loadMyTeam = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        setTeam(null);
        setMembers([]);
        setStats({ scrimsThisWeek: 0, confirmed: 0, pending: 0, cancelled: 0 });
        setLoading(false);
        return;
      }

      // 1) Get profile → primary_team_id
      const { data: p, error: pErr } = await supabase
        .from('Profiles')
        .select('id, username, handle, primary_team_id, primary_region')
        .eq('id', user.id)
        .maybeSingle();

      if (pErr) throw pErr;

      const profile = (p ?? null) as ProfileRow | null;
      const teamId = profile?.primary_team_id ?? null;

      if (!teamId) {
        setTeam(null);
        setMembers([]);
        setStats({ scrimsThisWeek: 0, confirmed: 0, pending: 0, cancelled: 0 });
        setLoading(false);
        return;
      }

      // 2) Fetch team
      const { data: t, error: tErr } = await supabase
        .from('teams')
        .select('id, owner_id, name, tag, region, time_zone, created_at')
        .eq('id', teamId)
        .maybeSingle();

      if (tErr) throw tErr;

      const teamRow = (t ?? null) as TeamRow | null;
      setTeam(teamRow);

      if (!teamRow?.id) {
        setMembers([]);
        setStats({ scrimsThisWeek: 0, confirmed: 0, pending: 0, cancelled: 0 });
        setLoading(false);
        return;
      }

      const ownerId = teamRow?.owner_id ?? null;

      // 3) Fetch team_members
      const { data: tm, error: tmErr } = await supabase
        .from('team_members')
        .select('id, team_id, user_id, status, created_at')
        .eq('team_id', teamId);

      if (tmErr) throw tmErr;

      let teamMembers = (tm ?? []) as TeamMemberRow[];

      // ✅ Ensure owner shows up in UI even if there's no team_members row for them
      if (ownerId && !teamMembers.some((m) => m.user_id === ownerId)) {
        teamMembers = [
          {
            id: `owner-${ownerId}`,
            team_id: teamId,
            user_id: ownerId,
            status: 'active',
            created_at: null,
          },
          ...teamMembers,
        ];
      } else if (ownerId) {
        // Move owner to top for display
        teamMembers = [
          ...teamMembers.filter((m) => m.user_id === ownerId),
          ...teamMembers.filter((m) => m.user_id !== ownerId),
        ];
      }

      // 4) Fetch member profiles for names/handles
      const userIds = Array.from(new Set(teamMembers.map((m) => m.user_id)));
      let profilesById: Record<string, { username: string | null; handle: string | null }> = {};

      if (userIds.length > 0) {
        const { data: mp, error: mpErr } = await supabase
          .from('Profiles')
          .select('id, username, handle')
          .in('id', userIds);

        if (mpErr) throw mpErr;

        (mp ?? []).forEach((row: any) => {
          profilesById[row.id] = { username: row.username ?? null, handle: row.handle ?? null };
        });
      }

      const membersUI: MemberUI[] = teamMembers
        .filter((m) => {
          const st = (m.status ?? '').toLowerCase();
          if (ownerId && m.user_id === ownerId) return true;
          return st !== 'removed' && st !== 'left';
        })
        .map((m) => {
          const pr = profilesById[m.user_id];

          const baseDisplay =
            pr?.username?.trim()
              ? pr.username.trim()
              : pr?.handle?.trim()
                ? pr.handle.startsWith('@')
                  ? pr.handle
                  : `@${pr.handle}`
                : 'Member';

          const isOwner = !!ownerId && m.user_id === ownerId;
          const display = isOwner ? `${baseDisplay} (Owner)` : baseDisplay;

          return {
            id: m.user_id,
            name: display,
            role: '—',
            status: mapTeamMemberStatusToPresence(m.status),
            initials: initialsFromName(display),
          };
        });

      setMembers(membersUI);

      // 5) Scrim stats for team
      const weekStart = startOfWeekLocal();
      const weekStartIso = weekStart.toISOString();

      const { data: scrims, error: sErr } = await supabase
        .from('scrims')
        .select('id, host_team_id, status, start_time')
        .eq('host_team_id', teamId)
        .order('start_time', { ascending: false })
        .limit(300);

      if (sErr) throw sErr;

      const scrimRows = (scrims ?? []) as ScrimRow[];

      const thisWeek = scrimRows.filter((s) => new Date(s.start_time) >= new Date(weekStartIso));
      const confirmed = scrimRows.filter((s) => (s.status ?? '').toLowerCase() === 'confirmed');
      const pending = scrimRows.filter((s) => (s.status ?? '').toLowerCase() === 'pending');
      const cancelled = scrimRows.filter((s) => {
        const st = (s.status ?? '').toLowerCase();
        return st === 'cancelled' || st === 'canceled';
      });

      setStats({
        scrimsThisWeek: thisWeek.length,
        confirmed: confirmed.length,
        pending: pending.length,
        cancelled: cancelled.length,
      });

      setLoading(false);
    } catch (e: any) {
      console.log('MyTeam load error:', e);
      setErrorMsg(e?.message ?? 'Failed to load team.');
      setTeam(null);
      setMembers([]);
      setStats({ scrimsThisWeek: 0, confirmed: 0, pending: 0, cancelled: 0 });
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyTeam();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadMyTeam();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [loadMyTeam]);

  useFocusEffect(
    useCallback(() => {
      loadMyTeam();
    }, [loadMyTeam])
  );

  const maxMembers = 5;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Team</Text>
          <Text style={styles.headerSubtitle}>Manage your team and schedule scrims</Text>
        </View>

        {loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 28 }}>
            <ActivityIndicator />
            <Text style={{ color: '#9ca3af', marginTop: 10 }}>Loading…</Text>
          </View>
        ) : (
          <>
            {/* Team Card */}
            <View style={styles.teamCard}>
              <View style={styles.teamLogoContainer}>
                <View style={styles.teamLogo}>
                  <Text style={styles.teamLogoText}>{teamUi.tag}</Text>
                </View>
              </View>

              <Text style={styles.teamName}>{teamUi.name}</Text>

              <View style={styles.chipsRow}>
                <View style={styles.chipRegion}>
                  <Ionicons name="location" size={12} color="#60a5fa" />
                  <Text style={styles.chipText}>{teamUi.region}</Text>
                </View>
                <View style={styles.chipTier}>
                  <Ionicons name="trophy" size={12} color="#a78bfa" />
                  <Text style={styles.chipText}>{teamUi.tier}</Text>
                </View>
              </View>

              <Text style={styles.teamDescription}>{teamUi.description}</Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Team Activity</Text>
              <View style={styles.statsGrid}>
                {statsUi.map((stat, index) => (
                  <View key={index} style={styles.statCard}>
                    <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Team Members */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Team Members</Text>
                <Text style={styles.memberCount}>
                  {members.length}/{maxMembers}
                </Text>
              </View>

              <View style={styles.membersCard}>
                {members.length === 0 ? (
                  <View style={{ padding: 14 }}>
                    <Text style={{ color: '#9ca3af' }}>No team members found yet.</Text>
                  </View>
                ) : (
                  members.map((member, index) => (
                    <View key={member.id}>
                      <Pressable
                        style={({ pressed }) => [styles.memberRow, pressed && styles.memberRowPressed]}
                        onPress={() => console.log('TODO: open member', member.id)}
                      >
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberAvatarText}>{member.initials}</Text>
                          <View style={[styles.statusDot, { backgroundColor: getStatusColor(member.status) }]} />
                        </View>

                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName}>{member.name}</Text>
                          <Text style={styles.memberRole}>{member.role}</Text>
                        </View>

                        <View style={[styles.statusPill, { backgroundColor: `${getStatusColor(member.status)}20` }]}>
                          <View style={[styles.statusPillDot, { backgroundColor: getStatusColor(member.status) }]} />
                          <Text style={[styles.statusText, { color: getStatusColor(member.status) }]}>
                            {getStatusLabel(member.status)}
                          </Text>
                        </View>
                      </Pressable>
                      {index < members.length - 1 && <View style={styles.divider} />}
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* Invite Button */}
            <Pressable
              style={({ pressed }) => [styles.inviteButton, pressed && styles.inviteButtonPressed]}
              onPress={() => router.push('/invite-member')}
            >
              <Ionicons name="person-add" size={20} color="#ffffff" />
              <Text style={styles.inviteButtonText}>Invite Team Member</Text>
            </Pressable>

            {errorMsg ? <Text style={{ color: '#fca5a5', marginBottom: 12 }}>{errorMsg}</Text> : null}

            <View style={styles.bottomSpacer} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  header: { marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#9ca3af' },

  teamCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  teamLogoContainer: { marginBottom: 16 },
  teamLogo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  teamLogoText: { fontSize: 28, fontWeight: '700', color: '#3b82f6' },
  teamName: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 12 },
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chipRegion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e3a8a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipTier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#581c87',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: '#ffffff' },
  teamDescription: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  memberCount: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  statValue: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#9ca3af', textAlign: 'center' },

  membersCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 },
  memberRowPressed: { backgroundColor: '#27272a', borderRadius: 12 },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  memberAvatarText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1a1a1b',
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#ffffff', marginBottom: 2 },
  memberRole: { fontSize: 13, color: '#9ca3af' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusPillDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },

  divider: { height: 1, backgroundColor: '#27272a', marginHorizontal: 12 },

  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  inviteButtonPressed: { backgroundColor: '#2563eb', opacity: 0.9 },
  inviteButtonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },

  bottomSpacer: { height: 40 },
});
