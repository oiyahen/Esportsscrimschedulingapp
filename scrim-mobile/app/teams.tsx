import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

type TeamRow = {
  id: string;
  name: string | null;
  tag: string | null;
  region: string | null;
  time_zone: string | null;
  owner_id: string;
  created_at: string | null;
};

type InviteRow = {
  id: string;
  team_id: string;
  invited_user_id: string;
  invited_by: string;
  status: string;
  created_at: string;
  responded_at: string | null;
};

const REGION_LABELS: Record<string, string> = {
  'pacific-nw': 'Pacific Northwest',
  'pacific-sw': 'Pacific Southwest',
  'central-north': 'Central North',
  'central-south': 'Central South',
  'atlantic-north': 'Atlantic North',
  'atlantic-south': 'Atlantic South',
};

function regionLabel(raw: any) {
  const key = String(raw ?? '').toLowerCase().trim();
  return REGION_LABELS[key] ?? raw ?? '—';
}

export default function TeamsScreen() {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [primaryTeamId, setPrimaryTeamId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // NEW: pending invites
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [invitesTeams, setInvitesTeams] = useState<Record<string, TeamRow>>({});
  const [invitesLoading, setInvitesLoading] = useState(false);

  const loadInvites = async (uid: string) => {
    try {
      setInvitesLoading(true);

      const { data: inv, error: invErr } = await supabase
        .from('team_invites')
        .select('id, team_id, invited_user_id, invited_by, status, created_at, responded_at')
        .eq('invited_user_id', uid)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (invErr) throw invErr;

      const rows = (inv ?? []) as any as InviteRow[];
      setInvites(rows);

      const teamIds = Array.from(new Set(rows.map((r) => r.team_id))).filter(Boolean);

      if (teamIds.length === 0) {
        setInvitesTeams({});
        setInvitesLoading(false);
        return;
      }

      const { data: t, error: tErr } = await supabase
        .from('teams')
        .select('id, name, tag, region, time_zone, owner_id, created_at')
        .in('id', teamIds);

      if (tErr) throw tErr;

      const map: Record<string, TeamRow> = {};
      (t ?? []).forEach((row: any) => {
        if (row?.id) map[row.id] = row;
      });

      setInvitesTeams(map);
      setInvitesLoading(false);
    } catch (e: any) {
      console.log('[Teams] invites load error:', e);
      setInvites([]);
      setInvitesTeams({});
      setInvitesLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      setErrorMsg(null);
      setLoading(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        setUserId(null);
        setPrimaryTeamId(null);
        setTeams([]);
        setInvites([]);
        setInvitesTeams({});
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Primary team id
      const { data: prof, error: profErr } = await supabase
        .from('Profiles')
        .select('primary_team_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profErr) setPrimaryTeamId((prof as any)?.primary_team_id ?? null);

      // Load invites in parallel-ish
      loadInvites(user.id);

      // Owned teams
      const { data: owned, error: ownedErr } = await supabase
        .from('teams')
        .select('id, name, tag, region, time_zone, owner_id, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (ownedErr) throw ownedErr;

      // Member teams
      const { data: memberRows, error: memberErr } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .in('status', ['active', 'invited', 'pending']);

      if (memberErr) throw memberErr;

      const memberTeamIds = Array.from(new Set((memberRows ?? []).map((r: any) => r.team_id))).filter(Boolean);

      let memberTeams: TeamRow[] = [];
      if (memberTeamIds.length > 0) {
        const { data: teamsData, error: teamsErr } = await supabase
          .from('teams')
          .select('id, name, tag, region, time_zone, owner_id, created_at')
          .in('id', memberTeamIds)
          .order('created_at', { ascending: false });

        if (teamsErr) throw teamsErr;
        memberTeams = (teamsData ?? []) as any;
      }

      // Merge + dedupe
      const merged = [...(owned ?? []), ...memberTeams];
      const seen = new Set<string>();
      const deduped: TeamRow[] = [];
      for (const t of merged as any[]) {
        if (!t?.id) continue;
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        deduped.push(t);
      }

      setTeams(deduped);
    } catch (e: any) {
      console.log('[Teams] load error:', e);
      setErrorMsg(e?.message ?? 'Failed to load teams.');
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadTeams();
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasTeams = teams.length > 0;

  const sortedTeams = useMemo(() => {
    if (!primaryTeamId) return teams;

    const primary = teams.filter((t) => t.id === primaryTeamId);
    const rest = teams.filter((t) => t.id !== primaryTeamId);
    return [...primary, ...rest];
  }, [teams, primaryTeamId]);

  const headerSubtitle = useMemo(() => {
    if (loading) return 'Loading…';
    if (!hasTeams) return 'Create your first team to start scrimming.';
    return `${teams.length} team${teams.length === 1 ? '' : 's'}`;
  }, [loading, hasTeams, teams.length]);

  const onSetPrimary = async (teamId: string) => {
    try {
      if (!userId) return;

      const { error } = await supabase.from('Profiles').update({ primary_team_id: teamId }).eq('id', userId);
      if (error) throw error;

      setPrimaryTeamId(teamId);
    } catch (e: any) {
      console.log('[Teams] set primary error:', e);
      Alert.alert('Could not set primary', e?.message ?? 'Please try again.');
    }
  };

  const onViewTeam = (team: TeamRow) => {
    const isOwner = !!userId && team.owner_id === userId;

    if (isOwner) {
      router.push(`/create-team?id=${team.id}`);
      return;
    }

    router.push('/(tabs)/my_team');
  };

  const acceptInvite = async (inv: InviteRow) => {
    try {
      if (!userId) return;

      // 1) Add membership
      const { error: mErr } = await supabase.from('team_members').insert({
        team_id: inv.team_id,
        user_id: userId,
        status: 'active',
      });

      if (mErr) throw mErr;

      // 2) Mark invite accepted
      const { error: upErr } = await supabase
        .from('team_invites')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', inv.id);

      if (upErr) throw upErr;

      // Refresh lists
      await loadTeams();
    } catch (e: any) {
      console.log('[Teams] accept invite error:', e);
      Alert.alert('Could not accept invite', e?.message ?? 'Please try again.');
    }
  };

  const declineInvite = async (inv: InviteRow) => {
    try {
      const { error: upErr } = await supabase
        .from('team_invites')
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq('id', inv.id);

      if (upErr) throw upErr;

      await loadTeams();
    } catch (e: any) {
      console.log('[Teams] decline invite error:', e);
      Alert.alert('Could not decline invite', e?.message ?? 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color="#e5e7eb" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Teams</Text>
            <Text style={styles.subtitle}>{headerSubtitle}</Text>
          </View>

          <Pressable
            onPress={() => router.push('/create-team')}
            style={[
              styles.iconBtn,
              { backgroundColor: 'rgba(59,130,246,0.18)', borderColor: 'rgba(59,130,246,0.45)' },
            ]}
            hitSlop={10}
          >
            <Ionicons name="add" size={20} color="#60a5fa" />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading…</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>
            {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

            {/* Pending Invites */}
            <View style={{ marginBottom: 14 }}>
              <View style={styles.invitesHeaderRow}>
                <Text style={styles.invitesTitle}>Pending Invites</Text>
                {invitesLoading ? <Text style={styles.invitesSubtitle}>Loading…</Text> : null}
              </View>

              {invites.length === 0 ? (
                <View style={styles.invitesEmpty}>
                  <Ionicons name="mail-open-outline" size={18} color="#94a3b8" />
                  <Text style={styles.invitesEmptyText}>No invites right now</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {invites.map((inv) => {
                    const t = invitesTeams[inv.team_id];
                    return (
                      <View key={inv.id} style={styles.inviteCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.inviteTeamName}>{t?.name ?? 'Team'}</Text>
                          <Text style={styles.inviteMeta}>
                            {t?.tag ? `[${t.tag}]` : '—'} · {regionLabel(t?.region)} · {t?.time_zone ?? '—'}
                          </Text>
                        </View>

                        <View style={styles.inviteActions}>
                          <Pressable
                            onPress={() => acceptInvite(inv)}
                            style={({ pressed }) => [styles.inviteAccept, pressed && { opacity: 0.9 }]}
                          >
                            <Text style={styles.inviteAcceptText}>Accept</Text>
                          </Pressable>

                          <Pressable
                            onPress={() => declineInvite(inv)}
                            style={({ pressed }) => [styles.inviteDecline, pressed && { opacity: 0.9 }]}
                          >
                            <Text style={styles.inviteDeclineText}>Decline</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {!hasTeams ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No teams yet</Text>
                <Text style={styles.emptyText}>You’ll need a team to post scrims and accept opponents.</Text>

                <Pressable
                  onPress={() => router.push('/create-team')}
                  style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.primaryBtnText}>Create Team</Text>
                  <Ionicons name="chevron-forward" size={16} color="#fff" />
                </Pressable>
              </View>
            ) : null}

            {hasTeams ? (
              <View style={{ gap: 12 }}>
                {sortedTeams.map((t) => {
                  const isOwner = !!userId && t.owner_id === userId;
                  const isPrimary = !!primaryTeamId && primaryTeamId === t.id;

                  return (
                    <View key={t.id} style={[styles.teamCard, isPrimary && styles.teamCardPrimary]}>
                      <View style={styles.teamRowTop}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.teamName}>{t.name ?? 'Unnamed Team'}</Text>

                            {isPrimary ? (
                              <View style={styles.primaryPill}>
                                <Ionicons name="star" size={12} color="#60a5fa" />
                                <Text style={styles.primaryPillText}>PRIMARY</Text>
                              </View>
                            ) : null}
                          </View>

                          <Text style={styles.teamMeta}>
                            {t.tag ? `[${t.tag}]` : '—'} · {regionLabel(t.region)} · {t.time_zone ?? '—'}
                          </Text>
                        </View>

                        <View style={[styles.badge, isOwner ? styles.badgeOwner : styles.badgeMember]}>
                          <Text style={[styles.badgeText, isOwner ? { color: '#60a5fa' } : { color: '#34d399' }]}>
                            {isOwner ? 'Owner' : 'Member'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.teamActions}>
                        <Pressable
                          onPress={() => onSetPrimary(t.id)}
                          style={({ pressed }) => [
                            styles.ghostBtn,
                            pressed && { opacity: 0.85 },
                            isPrimary && styles.ghostBtnPrimary,
                          ]}
                        >
                          <Text style={styles.ghostBtnText}>{isPrimary ? 'Primary' : 'Set as Primary'}</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => onViewTeam(t)}
                          style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.85 }]}
                        >
                          <Text style={styles.ghostBtnText}>{isOwner ? 'Settings' : 'View'}</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </ScrollView>
        )}

        <Text style={styles.footer}>Pinnacle — Passion. Potential. Performance.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0a0b' },
  container: { flex: 1, padding: 16 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#1a1a1b',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  subtitle: { color: '#9ca3af', marginTop: 2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#9ca3af', marginTop: 10 },

  error: { color: '#fca5a5', marginBottom: 10 },

  invitesHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  invitesTitle: { color: '#fff', fontSize: 14, fontWeight: '900' },
  invitesSubtitle: { color: '#9ca3af', fontSize: 12 },

  invitesEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1a1b',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  invitesEmptyText: { color: '#94a3b8', fontWeight: '800' },

  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  inviteTeamName: { color: '#fff', fontSize: 14, fontWeight: '900' },
  inviteMeta: { color: '#9ca3af', marginTop: 4, fontSize: 12 },

  inviteActions: { flexDirection: 'row', gap: 8 },
  inviteAccept: {
    backgroundColor: 'rgba(52,211,153,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  inviteAcceptText: { color: '#34d399', fontWeight: '900' },
  inviteDecline: {
    backgroundColor: 'rgba(239,68,68,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  inviteDeclineText: { color: '#f87171', fontWeight: '900' },

  emptyCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 14,
  },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  emptyText: { color: '#9ca3af', marginTop: 6, lineHeight: 18 },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },

  teamCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  teamCardPrimary: {
    borderColor: 'rgba(96,165,250,0.55)',
    backgroundColor: 'rgba(96,165,250,0.08)',
  },

  teamRowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teamName: { color: '#fff', fontSize: 16, fontWeight: '900' },
  teamMeta: { color: '#9ca3af', marginTop: 4 },

  primaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(96,165,250,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.35)',
  },
  primaryPillText: { color: '#60a5fa', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },

  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  badgeOwner: { backgroundColor: 'rgba(96,165,250,0.14)', borderColor: 'rgba(96,165,250,0.35)' },
  badgeMember: { backgroundColor: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.30)' },
  badgeText: { fontWeight: '900', fontSize: 12 },

  teamActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  ghostBtn: {
    flex: 1,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  ghostBtnPrimary: {
    borderColor: 'rgba(96,165,250,0.35)',
    backgroundColor: 'rgba(96,165,250,0.10)',
  },
  ghostBtnText: { color: '#e5e7eb', fontWeight: '800' },

  footer: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 14 },
});
