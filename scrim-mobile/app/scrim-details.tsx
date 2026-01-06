import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../lib/supabase';

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

const REGION_ALIASES: Record<string, RegionId> = {
  'pacfic-nw': 'pacific-nw', // common typo
  pacificnw: 'pacific-nw',
  'pacific-northwest': 'pacific-nw',
};

function normalizeRegion(raw: any) {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/_/g, '-');
}

function fmtDate(iso: string, tz?: string | null) {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  if (tz) (opts as any).timeZone = tz;
  return d.toLocaleString(undefined, opts);
}

function minutesBetween(startIso: string, endIso: string) {
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return 0;
  return Math.max(0, Math.round((e - s) / 60000));
}

function scrimTypeLabel(scrimType?: string | null, modes?: string[] | null) {
  const t = (scrimType ?? '').toLowerCase();

  // Prefer scrim_type
  if (t === 'hp-only') return 'Hardpoint';
  if (t === 'snd-only') return 'S&D';
  if (t === 'third-only') return '3rd Mode';
  if (t === 'all-respawns') return 'Respawns';
  if (t === 'mixed') return 'Respawns'; // legacy catch; you can change later

  // Fallback from modes array
  const m = (modes ?? []).map((x) => String(x).toLowerCase());
  if (m.includes('hp') || m.includes('hardpoint')) return 'Hardpoint';
  if (m.includes('snd') || m.includes('search') || m.includes('search and destroy')) return 'S&D';
  if (m.includes('control') || m.includes('third') || m.includes('3rd')) return '3rd Mode';

  return 'Scrim';
}

function statusLabel(status?: string | null) {
  if (!status) return '—';
  const s = status.toLowerCase();
  if (s === 'open') return 'Open';
  if (s === 'pending') return 'Pending';
  if (s === 'confirmed') return 'Confirmed';
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
  return status;
}

// Match Scrim Center / Details mapping you settled on:
// Open = Blue, Pending = Yellow, Confirmed = Green, Cancelled = Red
function statusColor(status?: string | null) {
  const s = (status ?? '').toLowerCase();
  if (s === 'open') return { bg: 'rgba(59,130,246,0.15)', fg: '#60a5fa', bd: '#1d4ed8' };
  if (s === 'pending') return { bg: 'rgba(234,179,8,0.15)', fg: '#fbbf24', bd: '#a16207' };
  if (s === 'confirmed') return { bg: 'rgba(52,211,153,0.15)', fg: '#34d399', bd: '#047857' };
  if (s === 'cancelled' || s === 'canceled')
    return { bg: 'rgba(248,113,113,0.15)', fg: '#f87171', bd: '#991b1b' };
  return { bg: 'rgba(156,163,175,0.12)', fg: '#9ca3af', bd: '#374151' };
}

type TeamMini = { id: string; name: string | null; tag: string | null };

type ScrimRow = {
  id: string;
  host_team_id: string;
  opponent_team_id: string | null;
  status: string;
  region: string;
  tier: string | null;
  modes: string[] | null;
  start_time: string;
  end_time: string;
  time_zone: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  scrim_type: string | null;
  duration_minutes: number | null;
  host_team?: TeamMini | null;
  opp_team?: TeamMini | null;
};

export default function ScrimDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const scrimId = typeof id === 'string' ? id : null;

  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);

  const [scrim, setScrim] = useState<ScrimRow | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      if (!scrimId) {
        setScrim(null);
        setErrorMsg('Missing scrim id.');
        setLoading(false);
        return;
      }

      const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw sessErr;

      const user = sessionData.session?.user;
      setMyUserId(user?.id ?? null);

      // Profile row may not exist — safe
      if (user?.id) {
        const { data: p, error: pErr } = await supabase
          .from('Profiles')
          .select('primary_team_id')
          .eq('id', user.id)
          .maybeSingle();

        if (!pErr) setMyTeamId(p?.primary_team_id ?? null);
        else setMyTeamId(null);
      } else {
        setMyTeamId(null);
      }

      const { data, error } = await supabase
        .from('scrims')
        .select(
          `
          id, host_team_id, opponent_team_id, status, region, tier, modes,
          start_time, end_time, time_zone, notes, created_by, created_at,
          scrim_type, duration_minutes,
          host_team:teams!scrims_host_team_id_fkey ( id, name, tag ),
          opp_team:teams!scrims_opponent_team_id_fkey ( id, name, tag )
        `
        )
        .eq('id', scrimId)
        .single();

      if (error) throw error;

      setScrim(data as any);
      setLoading(false);
    } catch (e: any) {
      console.log('[ScrimDetails] load error:', e);
      setErrorMsg(e?.message ?? 'Failed to load scrim.');
      setScrim(null);
      setLoading(false);
    }
  }, [scrimId]);

  useEffect(() => {
    load();
  }, [load]);

  const scrimStatus = (scrim?.status ?? '').toLowerCase();

  const isHostTeam = useMemo(() => {
    if (!scrim || !myTeamId) return false;
    return scrim.host_team_id === myTeamId;
  }, [scrim, myTeamId]);

  const isOpponentTeam = useMemo(() => {
    if (!scrim || !myTeamId) return false;
    return !!scrim.opponent_team_id && scrim.opponent_team_id === myTeamId;
  }, [scrim, myTeamId]);

  const isInScrim = useMemo(() => isHostTeam || isOpponentTeam, [isHostTeam, isOpponentTeam]);

  const isTakenByOtherTeam = useMemo(() => {
    if (!scrim || !myTeamId) return false;
    if (scrimStatus !== 'open') return false;
    if (!scrim.opponent_team_id) return false;
    return scrim.opponent_team_id !== myTeamId;
  }, [scrim, myTeamId, scrimStatus]);

  const canAcceptOpen = useMemo(() => {
    if (!scrim) return false;
    if (!myTeamId) return false;
    if (isHostTeam) return false;
    if (scrimStatus !== 'open') return false;
    if (isTakenByOtherTeam) return false;
    // Accept only if untaken
    return !scrim.opponent_team_id;
  }, [scrim, myTeamId, isHostTeam, scrimStatus, isTakenByOtherTeam]);

  const canCancel = useMemo(() => {
    if (!scrim) return false;
    const s = scrimStatus;
    return isHostTeam && s !== 'cancelled' && s !== 'canceled';
  }, [scrim, isHostTeam, scrimStatus]);

  const regionLabel = useMemo(() => {
    const raw = normalizeRegion(scrim?.region);
    const key = REGION_ALIASES[raw] ?? (raw as any);
    return REGION_LABELS[key as RegionId] || key || '—';
  }, [scrim?.region]);

  const typeLabel = useMemo(
    () => scrimTypeLabel(scrim?.scrim_type, scrim?.modes ?? null),
    [scrim?.scrim_type, scrim?.modes]
  );

  const durationLabel = useMemo(() => {
    if (!scrim?.start_time || !scrim?.end_time) return '—';
    const computed = minutesBetween(scrim.start_time, scrim.end_time);
    const mins = computed || scrim.duration_minutes || 0;
    if (!mins) return '—';

    const hrs = mins / 60;
    const rounded = Math.round(hrs * 10) / 10;
    return `${rounded}h`;
  }, [scrim?.duration_minutes, scrim?.start_time, scrim?.end_time]);

  const hostName = useMemo(() => scrim?.host_team?.name ?? 'Unknown Team', [scrim?.host_team?.name]);

  const oppName = useMemo(() => {
    if (scrim?.opp_team?.name) return scrim.opp_team.name;
    if (scrim?.opponent_team_id) return 'Opponent';
    return '—';
  }, [scrim?.opp_team?.name, scrim?.opponent_team_id]);

  // ✅ Accept immediately for open scrims (race-safe)
  const doAcceptOpen = async () => {
    if (!scrimId || !myTeamId) return;

    try {
      setActing(true);
      setErrorMsg(null);

      const { data: updated, error } = await supabase
        .from('scrims')
        .update({
          status: 'confirmed',
          opponent_team_id: myTeamId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', scrimId)
        .eq('status', 'open')
        .is('opponent_team_id', null)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      if (!updated?.id) {
        Alert.alert('Already taken', 'Another team accepted this scrim before you.');
        await load();
        return;
      }

      await load();
    } catch (e: any) {
      console.log('[ScrimDetails] accept open error:', e);
      setErrorMsg(e?.message ?? 'Failed to accept scrim.');
    } finally {
      setActing(false);
    }
  };

  const doCancel = async () => {
    if (!scrimId) return;

    Alert.alert('Cancel scrim?', 'This will mark the scrim as cancelled.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel scrim',
        style: 'destructive',
        onPress: async () => {
          try {
            setActing(true);
            setErrorMsg(null);

            const { error } = await supabase
              .from('scrims')
              .update({ status: 'cancelled', updated_at: new Date().toISOString() })
              .eq('id', scrimId);

            if (error) throw error;

            await load();
          } catch (e: any) {
            console.log('[ScrimDetails] cancel error:', e);
            setErrorMsg(e?.message ?? 'Failed to cancel scrim.');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  };

  const statusStyle = statusColor(scrim?.status);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color="#e5e7eb" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Scrim Details</Text>
            <Text style={styles.subtitle}>{typeLabel}</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.bd }]}>
            <Text style={[styles.badgeText, { color: statusStyle.fg }]}>{statusLabel(scrim?.status)}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.mutedText}>Loading…</Text>
          </View>
        ) : !scrim ? (
          <View style={styles.card}>
            <Text style={styles.rowValue}>Could not load scrim.</Text>
            {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.kvRow}>
                <Text style={styles.rowLabel}>Host</Text>
                <Text style={styles.rowValue}>{hostName}</Text>
              </View>

              <View style={styles.kvRow}>
                <Text style={styles.rowLabel}>Opponent</Text>
                <Text style={styles.rowValue}>{oppName}</Text>
              </View>

              <View style={styles.kvRow}>
                <Text style={styles.rowLabel}>When</Text>
                <Text style={styles.rowValue}>
                  {fmtDate(scrim.start_time, scrim.time_zone)} {scrim.time_zone ? `(${scrim.time_zone})` : ''}
                </Text>
              </View>

              <View style={styles.kvRow}>
                <Text style={styles.rowLabel}>Duration</Text>
                <Text style={styles.rowValue}>{durationLabel}</Text>
              </View>

              <View style={styles.kvRow}>
                <Text style={styles.rowLabel}>Region</Text>
                <Text style={styles.rowValue}>{regionLabel}</Text>
              </View>

              <View style={styles.kvRow}>
                <Text style={styles.rowLabel}>Tier</Text>
                <Text style={styles.rowValue}>{scrim.tier ?? 'Any'}</Text>
              </View>

              {scrim.notes ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.rowLabel}>Notes</Text>
                  <Text style={[styles.rowValue, { marginTop: 6 }]}>{scrim.notes}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.actionsCard}>
              {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

              {!myTeamId ? (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    You need a team to accept scrims. Create a team or set a primary team in Profile → Teams.
                  </Text>

                  <Pressable
                    disabled={acting}
                    onPress={() => router.push('/create-team')}
                    style={[styles.btnPrimary, acting && { opacity: 0.7 }]}
                  >
                    <Text style={styles.btnPrimaryText}>Create Team</Text>
                  </Pressable>
                </View>
              ) : null}

              {myTeamId && isTakenByOtherTeam ? (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>This scrim slot has already been taken by another team.</Text>
                </View>
              ) : null}

              {/* Open scrim, not host, has team, untaken */}
              {myTeamId && canAcceptOpen ? (
                <Pressable
                  disabled={acting}
                  onPress={doAcceptOpen}
                  style={[styles.btnPrimary, acting && { opacity: 0.7 }]}
                >
                  {acting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Accept Scrim</Text>}
                </Pressable>
              ) : null}

              {/* Confirmed & I'm involved — just informational (no CTA needed yet) */}
              {myTeamId && scrimStatus === 'confirmed' && isInScrim ? (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>This scrim is confirmed. You’re in the match.</Text>
                </View>
              ) : null}

              {/* Host-only cancel */}
              {myTeamId && canCancel ? (
                <Pressable disabled={acting} onPress={doCancel} style={[styles.btnDanger, acting && { opacity: 0.7 }]}>
                  <Text style={styles.btnDangerText}>Cancel Scrim</Text>
                </Pressable>
              ) : null}

              <Pressable disabled={acting} onPress={load} style={[styles.btnLink, acting && { opacity: 0.7 }]}>
                <Text style={styles.btnLinkText}>Refresh</Text>
              </Pressable>
            </View>
          </>
        )}

        <Text style={styles.footer}>Pinnacle — Passion. Potential. Performance.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0a0b' },
  container: { padding: 16, paddingBottom: 28 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  title: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  subtitle: { color: '#9ca3af', marginTop: 2 },

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

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: '900' },

  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28 },
  mutedText: { color: '#9ca3af', marginTop: 10 },

  card: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },

  kvRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  rowLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800', width: 92 },
  rowValue: { color: '#e5e7eb', fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },

  actionsCard: {
    marginTop: 12,
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 10,
  },

  infoBox: {
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  infoText: { color: '#9ca3af', fontSize: 12, fontWeight: '700' },

  btnPrimary: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#3b82f6' },
  btnPrimaryText: { color: '#ffffff', fontWeight: '900' },

  btnDanger: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(248,113,113,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.45)',
  },
  btnDangerText: { color: '#fca5a5', fontWeight: '900' },

  btnLink: { alignItems: 'center', paddingVertical: 8 },
  btnLinkText: { color: '#60a5fa', fontWeight: '900' },

  error: { color: '#fca5a5', fontSize: 12 },

  footer: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 18 },
});
