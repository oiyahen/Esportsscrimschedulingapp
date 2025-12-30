import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

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

// Common legacy/bad values
const REGION_ALIASES: Record<string, RegionId> = {
  'pacfic-nw': 'pacific-nw',
  'pacificnw': 'pacific-nw',
  'pacific-northwest': 'pacific-nw',
};

type ScrimRow = {
  id: string;
  status: string;
  region: string;
  tier: string | null;
  modes: string[] | null;
  scrim_type: string | null;
  start_time: string;
  end_time: string;
  time_zone: string | null;
  notes: string | null;

  host_team_id: string;
  opponent_team_id: string | null;

  teams?: {
    name: string | null;
    tag: string | null;
  } | null;
};

function normalizeRegion(raw: any) {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/_/g, '-');
}

function formatWhen(startISO: string, timeZoneLabel?: string | null) {
  const d = new Date(startISO);
  if (Number.isNaN(d.getTime())) return '—';

  const base = d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return timeZoneLabel ? `${base} (${timeZoneLabel})` : base;
}

function scrimTypeLabel(scrim_type: string | null, modes: string[] | null) {
  const t = (scrim_type ?? '').toLowerCase();

  if (t === 'hp-only') return 'Hardpoint';
  if (t === 'snd-only') return 'S&D';
  if (t === 'third-only') return 'Control';
  if (t === 'all-respawns') return 'Respawns';
  if (t === 'mixed') return 'Mixed';

  const m = (modes ?? []).map((x) => String(x).toLowerCase());
  if (m.includes('hp') || m.includes('hardpoint')) return 'Hardpoint';
  if (m.includes('snd') || m.includes('search') || m.includes('search and destroy')) return 'S&D';
  if (m.includes('control')) return 'Control';

  return 'Scrim';
}

export default function ScrimCenterScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ split lists
  const [openScrims, setOpenScrims] = useState<ScrimRow[]>([]);
  const [myScrims, setMyScrims] = useState<ScrimRow[]>([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);

  // Match Scrim Details colors:
  // Open = Blue, Pending = Yellow, Confirmed = Green, Cancelled = Red
  const getStatusColor = (status: string) => {
    switch ((status ?? '').toLowerCase()) {
      case 'open':
        return '#60a5fa';
      case 'pending':
        return '#fbbf24';
      case 'confirmed':
        return '#34d399';
      case 'cancelled':
      case 'canceled':
        return '#f87171';
      default:
        return '#9ca3af';
    }
  };

  const getStatusLabel = (status: string) => {
    const s = (status ?? '').toLowerCase();
    if (!s) return '—';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const getGameModeIcon = (label: string) => {
    switch (label) {
      case 'Hardpoint':
        return 'location';
      case 'S&D':
        return 'skull';
      case 'Control':
        return 'flag';
      case 'Respawns':
        return 'repeat';
      case 'Mixed':
        return 'shuffle';
      default:
        return 'game-controller';
    }
  };

  // Load myTeamId once (and on auth change)
  const loadMyTeam = async (): Promise<string | null> => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        setMyTeamId(null);
        return null;
      }

      const { data: p, error: pErr } = await supabase
        .from('Profiles')
        .select('primary_team_id')
        .eq('id', user.id)
        .maybeSingle();

      if (pErr) throw pErr;

      const teamId = p?.primary_team_id ?? null;
      setMyTeamId(teamId);
      return teamId;
    } catch (e) {
      console.log('[ScrimCenter] load my team error:', e);
      setMyTeamId(null);
      return null;
    }
  };

  const loadScrims = async (teamId: string | null) => {
    try {
      setErrorMsg(null);

      // 2) My scrims (only ones my team is involved in) — any status
      let mine: any[] = [];
      if (teamId) {
        const { data: myData, error: myErr } = await supabase
          .from('scrims')
          .select(
            `
            id,
            status,
            region,
            tier,
            modes,
            scrim_type,
            start_time,
            end_time,
            time_zone,
            notes,
            host_team_id,
            opponent_team_id,
            teams:teams!scrims_host_team_id_fkey (
              name,
              tag
            )
          `
          )
          .or(`host_team_id.eq.${teamId},opponent_team_id.eq.${teamId}`)
          .order('start_time', { ascending: true })
          .limit(100);

        if (myErr) throw myErr;
        mine = myData ?? [];
      }


      // 1) Marketplace / discoverable scrims (open only)
      const { data: openData, error: openErr } = await supabase
        .from('scrims')
        .select(
          `
          id,
          status,
          region,
          tier,
          modes,
          scrim_type,
          start_time,
          end_time,
          time_zone,
          notes,
          host_team_id,
          opponent_team_id,
          teams:teams!scrims_host_team_id_fkey (
            name,
            tag
          )
        `
        )
        .eq('status', 'open')
        .order('start_time', { ascending: true })
        .limit(100);

      if (openErr) throw openErr;

      setOpenScrims((openData ?? []) as any);
      setMyScrims((mine ?? []) as any);
    } catch (e: any) {
      console.log('[ScrimCenter] load scrims error:', e);
      setErrorMsg(e?.message ?? 'Failed to load scrims.');
      setOpenScrims([]);
      setMyScrims([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const teamId = await loadMyTeam();
      await loadScrims(teamId);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // switching accounts, sign-in/out
      init();
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    const teamId = await loadMyTeam();
    await loadScrims(teamId);
    setRefreshing(false);
  };

  // Shared mapper (turn a ScrimRow into UI model)
  const mapToUi = (s: ScrimRow) => {
    const type = scrimTypeLabel(s.scrim_type, s.modes);
    const hostName = s.teams?.name ?? 'Unknown Team';

    const regionKeyRaw = normalizeRegion(s.region);
    const regionKey = REGION_ALIASES[regionKeyRaw] ?? (regionKeyRaw as any);
    const regionLabel = REGION_LABELS[regionKey as RegionId] || regionKey || '—';

    const status = (s.status ?? 'open').toLowerCase();

    const isHost = !!myTeamId && s.host_team_id === myTeamId;

    // "Taken" means open but opponent_team_id is already set to someone else
    const takenByOther =
      status === 'open' &&
      !!s.opponent_team_id &&
      (!!myTeamId ? s.opponent_team_id !== myTeamId : true);

    let ctaLabel = 'View Details';
    let ctaDisabled = false;

    if (status === 'open') {
      if (isHost) {
        ctaLabel = 'View Details';
      } else if (takenByOther) {
        ctaLabel = 'Taken';
        ctaDisabled = true;
      } else {
        ctaLabel = 'Accept Scrim';
      }
    }

    return {
      id: s.id,
      scrimType: type,
      status,
      region: regionLabel,
      startTime: formatWhen(s.start_time, s.time_zone),
      hostTeamName: hostName,
      tier: s.tier ? s.tier : '—',
      notes: s.notes ?? '',
      ctaLabel,
      ctaDisabled,
    };
  };

  const uiOpenScrims = useMemo(() => openScrims.map(mapToUi), [openScrims, myTeamId]);
  const uiMyScrims = useMemo(() => myScrims.map(mapToUi), [myScrims, myTeamId]);

  const openCount = uiOpenScrims.length;

  const renderScrimCard = (scrim: ReturnType<typeof mapToUi>) => (
    <Pressable
      key={scrim.id}
      style={({ pressed }) => [styles.scrimCard, pressed && styles.scrimCardPressed]}
      onPress={() => router.push(`/scrim-details?id=${scrim.id}`)}
    >
      <View style={styles.scrimHeader}>
        <View style={styles.scrimTypeContainer}>
          <View style={styles.gameModeIcon}>
            <Ionicons name={getGameModeIcon(scrim.scrimType) as any} size={16} color="#60a5fa" />
          </View>
          <Text style={styles.scrimType}>{scrim.scrimType}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(scrim.status)}20` }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(scrim.status) }]} />
          <Text style={[styles.statusText, { color: getStatusColor(scrim.status) }]}>
            {getStatusLabel(scrim.status)}
          </Text>
        </View>
      </View>

      <Text style={styles.hostTeam}>{scrim.hostTeamName}</Text>

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={14} color="#9ca3af" />
          <Text style={styles.infoText}>{scrim.startTime}</Text>
        </View>

        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={14} color="#9ca3af" />
          <Text style={styles.infoText}>{scrim.region}</Text>
        </View>
      </View>

      <View style={styles.tierBadge}>
        <Ionicons name="trophy" size={12} color="#a78bfa" />
        <Text style={styles.tierText}>{scrim.tier}</Text>
      </View>

      {scrim.notes ? (
        <Text style={styles.notes} numberOfLines={2}>
          {scrim.notes}
        </Text>
      ) : null}

      <Pressable
        style={[
          styles.joinButton,
          scrim.ctaDisabled && { opacity: 0.5 },
          scrim.ctaLabel === 'Taken' && { backgroundColor: '#374151' },
          scrim.ctaLabel === 'View Details' && {
            backgroundColor: '#0b1220',
            borderWidth: 1,
            borderColor: '#111827',
          },
        ]}
        disabled={scrim.ctaDisabled}
        onPress={() => router.push(`/scrim-details?id=${scrim.id}`)}
      >
        <Text style={[styles.joinButtonText, scrim.ctaLabel === 'View Details' && { color: '#e5e7eb' }]}>
          {scrim.ctaLabel}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={scrim.ctaLabel === 'View Details' ? '#e5e7eb' : '#ffffff'}
        />
      </Pressable>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Scrim Center</Text>
            <Text style={styles.headerSubtitle}>Find and schedule competitive scrims</Text>
          </View>
        </View>

        <View style={styles.filterSection}>
          <Pressable style={styles.filterButton} onPress={() => console.log('TODO: filter')}>
            <Ionicons name="filter" size={18} color="#9ca3af" />
            <Text style={styles.filterButtonText}>Filter</Text>
          </Pressable>

          <Pressable style={styles.searchButton} onPress={() => console.log('TODO: search')}>
            <Ionicons name="search" size={18} color="#9ca3af" />
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.postButton, pressed && styles.postButtonPressed]}
          onPress={() => router.push('/create-scrim')}
        >
          <Ionicons name="add-circle" size={20} color="#ffffff" />
          <Text style={styles.postButtonText}>Post Scrim Slot</Text>
        </Pressable>

        {loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 28 }}>
            <ActivityIndicator />
            <Text style={{ color: '#9ca3af', marginTop: 10 }}>Loading…</Text>
          </View>
        ) : null}

        {errorMsg ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: '#fca5a5' }}>{errorMsg}</Text>
          </View>
        ) : null}


        {/* ✅ Personal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Scrims</Text>
            <Text style={styles.scrimCount}>{uiMyScrims.length} total</Text>
          </View>

          <View style={styles.scrimsList}>
            {!myTeamId ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No team set</Text>
                <Text style={styles.emptyText}>Create or select a team to track your scrims.</Text>
              </View>
            ) : uiMyScrims.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No scrims yet</Text>
                <Text style={styles.emptyText}>Post a slot or accept an open scrim to get started.</Text>
              </View>
            ) : (
              uiMyScrims.map(renderScrimCard)
            )}
          </View>
        </View>

        {/* ✅ Marketplace */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Scrims</Text>
            <Text style={styles.scrimCount}>{openCount} open</Text>
          </View>

          <View style={styles.scrimsList}>
            {uiOpenScrims.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No open scrims</Text>
                <Text style={styles.emptyText}>Check back soon or post a slot.</Text>
              </View>
            ) : (
              uiOpenScrims.map(renderScrimCard)
            )}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#9ca3af' },

  filterSection: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1a1a1b',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  filterButtonText: { fontSize: 14, fontWeight: '500', color: '#9ca3af' },
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1a1a1b',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  searchButtonText: { fontSize: 14, fontWeight: '500', color: '#9ca3af' },

  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  postButtonPressed: { backgroundColor: '#2563eb', opacity: 0.9 },
  postButtonText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },

  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#ffffff' },
  scrimCount: { fontSize: 14, fontWeight: '500', color: '#9ca3af' },

  scrimsList: { gap: 12 },

  emptyCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  emptyTitle: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  emptyText: { color: '#9ca3af', marginTop: 6 },

  scrimCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  scrimCardPressed: { backgroundColor: '#222223', borderColor: '#3b82f6' },

  scrimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scrimTypeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gameModeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrimType: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },

  hostTeam: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 12 },

  infoGrid: { gap: 8, marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: '#9ca3af' },

  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#581c87',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  tierText: { fontSize: 12, fontWeight: '600', color: '#ffffff' },

  notes: { fontSize: 13, color: '#9ca3af', lineHeight: 18, marginBottom: 12 },

  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 10,
  },
  joinButtonText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },

  bottomSpacer: { height: 40 },
});
