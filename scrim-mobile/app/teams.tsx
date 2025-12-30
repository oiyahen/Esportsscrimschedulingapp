import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTeams = async () => {
    try {
      setErrorMsg(null);
      setLoading(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        setUserId(null);
        setTeams([]);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // 1) Teams I own
      const { data: owned, error: ownedErr } = await supabase
        .from('teams')
        .select('id, name, tag, region, time_zone, owner_id, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (ownedErr) throw ownedErr;

      // 2) Teams I'm a member of (via team_members)
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

      // Merge owned + member teams (dedupe by id)
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

  const headerSubtitle = useMemo(() => {
    if (loading) return 'Loading…';
    if (!hasTeams) return 'Create your first team to start scrimming.';
    return `${teams.length} team${teams.length === 1 ? '' : 's'}`;
  }, [loading, hasTeams, teams.length]);

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

          {/* + Add team */}
          <Pressable
            onPress={() => router.push('/create-team')}
            style={[styles.iconBtn, { backgroundColor: 'rgba(59,130,246,0.18)', borderColor: 'rgba(59,130,246,0.45)' }]}
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

            {/* If no teams, show Create Team CTA */}
            {!hasTeams ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No teams yet</Text>
                <Text style={styles.emptyText}>
                  You’ll need a team to post scrims and accept opponents.
                </Text>

                <Pressable
                  onPress={() => router.push('/create-team')}
                  style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.primaryBtnText}>Create Team</Text>
                  <Ionicons name="chevron-forward" size={16} color="#fff" />
                </Pressable>
              </View>
            ) : null}

            {/* Teams list */}
            {hasTeams ? (
              <View style={{ gap: 12 }}>
                {teams.map((t) => {
                  const isOwner = !!userId && t.owner_id === userId;
                  return (
                    <View key={t.id} style={styles.teamCard}>
                      <View style={styles.teamRowTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.teamName}>{t.name ?? 'Unnamed Team'}</Text>
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

                      {/* Placeholder actions (we’ll wire later) */}
                      <View style={styles.teamActions}>
                        <Pressable
                          onPress={() => console.log('TODO: set primary team', t.id)}
                          style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.85 }]}
                        >
                          <Text style={styles.ghostBtnText}>Set as Primary</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => console.log('TODO: view team details', t.id)}
                          style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.85 }]}
                        >
                          <Text style={styles.ghostBtnText}>View</Text>
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
  teamRowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teamName: { color: '#fff', fontSize: 16, fontWeight: '900' },
  teamMeta: { color: '#9ca3af', marginTop: 4 },

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
  ghostBtnText: { color: '#e5e7eb', fontWeight: '800' },

  footer: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 14 },
});
