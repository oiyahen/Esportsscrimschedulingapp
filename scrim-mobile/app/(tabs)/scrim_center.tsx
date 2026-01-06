import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
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
  pacificnw: 'pacific-nw',
  'pacific-northwest': 'pacific-nw',
};

const REGION_OPTIONS: { id: 'all' | RegionId; label: string }[] = [
  { id: 'all', label: 'All Regions' },
  { id: 'pacific-nw', label: 'Pacific Northwest' },
  { id: 'pacific-sw', label: 'Pacific Southwest' },
  { id: 'central-north', label: 'Central North' },
  { id: 'central-south', label: 'Central South' },
  { id: 'atlantic-north', label: 'Atlantic North' },
  { id: 'atlantic-south', label: 'Atlantic South' },
];

const TYPE_OPTIONS: { id: 'all' | 'Hardpoint' | 'S&D' | '3rd Mode' | 'Respawns' | 'Mixed' | 'Scrim'; label: string }[] =
  [
    { id: 'all', label: 'All Types' },
    { id: 'Hardpoint', label: 'Hardpoint' },
    { id: 'S&D', label: 'S&D' },
    { id: '3rd Mode', label: '3rd Mode' },
    { id: 'Respawns', label: 'Respawns' },
  ];

const MY_STATUS_OPTIONS: { id: 'all' | 'open' | 'pending' | 'confirmed' | 'cancelled'; label: string }[] = [
  { id: 'all', label: 'All Status' },
  { id: 'open', label: 'Open' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'cancelled', label: 'Cancelled' },
];

type TeamMini = {
  name: string | null;
  tag: string | null;
} | null;

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

  // joins
  host_team?: TeamMini;
  opponent_team?: TeamMini;
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
  if (t === 'third-only') return '3rd Mode';
  if (t === 'all-respawns') return 'Respawns';
  if (t === 'mixed') return 'Mixed';

  const m = (modes ?? []).map((x) => String(x).toLowerCase());
  if (m.includes('hp') || m.includes('hardpoint')) return 'Hardpoint';
  if (m.includes('snd') || m.includes('search') || m.includes('search and destroy')) return 'S&D';
  if (m.includes('control')) return '3rd Mode';

  return 'Scrim';
}

export default function ScrimCenterScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [openScrims, setOpenScrims] = useState<ScrimRow[]>([]);
  const [myScrims, setMyScrims] = useState<ScrimRow[]>([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);

  // Search + Filter UI state
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState<'all' | RegionId>('all');
  const [filterType, setFilterType] = useState<'all' | 'Hardpoint' | 'S&D' | '3rd Mode' | 'Respawns' | 'Mixed' | 'Scrim'>(
    'all'
  );
  const [filterMyStatus, setFilterMyStatus] = useState<'all' | 'open' | 'pending' | 'confirmed' | 'cancelled'>('all');

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
    if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const getGameModeIcon = (label: string) => {
    switch (label) {
      case 'Hardpoint':
        return 'location';
      case 'S&D':
        return 'skull';
      case '3rd Mode':
        return 'flag';
      case 'Respawns':
        return 'repeat';
      case 'Mixed':
        return 'shuffle';
      default:
        return 'game-controller';
    }
  };

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

      // 1) My scrims (team is involved) — any status
      let mine: ScrimRow[] = [];
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
            host_team:teams!scrims_host_team_id_fkey (
              name,
              tag
            ),
            opponent_team:teams!scrims_opponent_team_id_fkey (
              name,
              tag
            )
          `
          )
          .or(`host_team_id.eq.${teamId},opponent_team_id.eq.${teamId}`)
          .order('start_time', { ascending: true })
          .limit(150);

        if (myErr) throw myErr;
        mine = (myData ?? []) as any;
      }

      // 2) Marketplace (open only)
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
          host_team:teams!scrims_host_team_id_fkey (
            name,
            tag
          )
        `
        )
        .eq('status', 'open')
        .order('start_time', { ascending: true })
        .limit(150);

      if (openErr) throw openErr;

      // ✅ Don’t show my own scrims in Available Scrims
      // ✅ Also, don’t show “open but already taken” (has opponent_team_id)
      const filteredOpen = (openData ?? []).filter((s: any) => {
        if (teamId && s.host_team_id === teamId) return false;
        if (s.opponent_team_id) return false;
        return true;
      });

      setOpenScrims(filteredOpen as any);
      setMyScrims(mine);
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

  const acceptOpenScrim = async (scrimId: string) => {
    if (!myTeamId) {
      setErrorMsg('You need a team to accept scrims. Create or select a primary team first.');
      return;
    }

    try {
      setRefreshing(true);
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
        setErrorMsg('Already taken — another team accepted this scrim first.');
        const teamId = await loadMyTeam();
        await loadScrims(teamId);
        return;
      }

      const teamId = await loadMyTeam();
      await loadScrims(teamId);
      router.push(`/scrim-details?id=${scrimId}`);
    } catch (e: any) {
      console.log('[ScrimCenter] accept error:', e);
      setErrorMsg(e?.message ?? 'Failed to accept scrim.');
    } finally {
      setRefreshing(false);
    }
  };

  const mapToUi = (s: ScrimRow, context: 'my' | 'open') => {
    const type = scrimTypeLabel(s.scrim_type, s.modes);

    const hostName = s.host_team?.name ?? 'Unknown Team';
    const opponentName = s.opponent_team?.name ?? null;

    const regionKeyRaw = normalizeRegion(s.region);
    const regionKey = REGION_ALIASES[regionKeyRaw] ?? (regionKeyRaw as any);
    const regionLabel = REGION_LABELS[regionKey as RegionId] || regionKey || '—';

    const status = (s.status ?? 'open').toLowerCase();

    const isHost = !!myTeamId && s.host_team_id === myTeamId;
    const isOpponent = !!myTeamId && s.opponent_team_id === myTeamId;

    const myOpponentLabel =
      context === 'my'
        ? isHost
          ? opponentName
            ? `Opponent: ${opponentName}`
            : 'Opponent: —'
          : isOpponent
            ? `Opponent: ${hostName}`
            : 'Opponent: —'
        : null;

    let ctaLabel = 'View Details';
    let ctaDisabled = false;

    if (context === 'open') {
      ctaLabel = 'Accept Scrim';
    } else {
      ctaLabel = 'View Details';
    }

    if (context === 'open' && !myTeamId) {
      ctaLabel = 'Create Team to Accept';
      ctaDisabled = true;
    }

    return {
      id: s.id,
      scrimType: type,
      scrimTypeKey: type as any,
      status,
      region: regionLabel,
      regionKey: (regionKey as string) || '',
      startTime: formatWhen(s.start_time, s.time_zone),
      hostTeamName: hostName,
      hostTeamTag: s.host_team?.tag ?? '',
      tier: s.tier ? s.tier : '—',
      notes: s.notes ?? '',
      ctaLabel,
      ctaDisabled,
      roleBadge: context === 'my' ? (isHost ? 'HOST' : isOpponent ? 'OPPONENT' : null) : null,
      opponentLine: myOpponentLabel,
    };
  };

  const uiOpenScrims = useMemo(() => openScrims.map((s) => mapToUi(s, 'open')), [openScrims, myTeamId]);
  const uiMyScrims = useMemo(() => myScrims.map((s) => mapToUi(s, 'my')), [myScrims, myTeamId]);

  const openCount = uiOpenScrims.length;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const applySearchAndFilters = <T extends ReturnType<typeof mapToUi>>(items: T[], context: 'my' | 'open') => {
    return items.filter((it) => {
      // Region filter
      if (filterRegion !== 'all') {
        const rk = normalizeRegion(it.regionKey);
        if (rk !== filterRegion) return false;
      }

      // Type filter
      if (filterType !== 'all') {
        if (it.scrimType !== filterType) return false;
      }

      // My status filter (only for "my")
      if (context === 'my' && filterMyStatus !== 'all') {
        const st = (it.status ?? '').toLowerCase();
        if (filterMyStatus === 'cancelled') {
          if (!(st === 'cancelled' || st === 'canceled')) return false;
        } else {
          if (st !== filterMyStatus) return false;
        }
      }

      // Search
      if (!normalizedQuery) return true;

      const haystack = [
        it.hostTeamName,
        it.hostTeamTag,
        it.region,
        it.regionKey,
        it.scrimType,
        it.status,
        it.startTime,
        it.tier,
        it.notes,
        it.opponentLine ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  };

  const filteredMyScrims = useMemo(
    () => applySearchAndFilters(uiMyScrims, 'my'),
    [uiMyScrims, normalizedQuery, filterRegion, filterType, filterMyStatus]
  );

  const filteredOpenScrims = useMemo(
    () => applySearchAndFilters(uiOpenScrims, 'open'),
    [uiOpenScrims, normalizedQuery, filterRegion, filterType, filterMyStatus]
  );

  const clearFilters = () => {
    setSearchQuery('');
    setFilterRegion('all');
    setFilterType('all');
    setFilterMyStatus('all');
  };

  const renderPills = <T extends string>(
    options: { id: T; label: string }[],
    value: T,
    setValue: (v: T) => void
  ) => {
    return (
      <View style={styles.pillRow}>
        {options.map((opt) => {
          const selected = opt.id === value;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setValue(opt.id)}
              style={[styles.pill, selected && styles.pillSelected]}
            >
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderScrimCard = (scrim: ReturnType<typeof mapToUi>) => (
    <View key={scrim.id} style={styles.scrimCard}>
      <View style={styles.scrimHeader}>
        <View style={styles.scrimTypeContainer}>
          <View style={styles.gameModeIcon}>
            <Ionicons name={getGameModeIcon(scrim.scrimType) as any} size={16} color="#60a5fa" />
          </View>

          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.scrimType}>{scrim.scrimType}</Text>
              {scrim.roleBadge ? (
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{scrim.roleBadge}</Text>
                </View>
              ) : null}
            </View>

            {scrim.opponentLine ? <Text style={styles.opponentLine}>{scrim.opponentLine}</Text> : null}
          </View>
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
          scrim.ctaLabel !== 'Accept Scrim' && {
            backgroundColor: '#0b1220',
            borderWidth: 1,
            borderColor: '#111827',
          },
        ]}
        disabled={scrim.ctaDisabled}
        onPress={() => {
          if (scrim.ctaLabel === 'Accept Scrim') {
            acceptOpenScrim(scrim.id);
            return;
          }
          router.push(`/scrim-details?id=${scrim.id}`);
        }}
      >
        <Text style={[styles.joinButtonText, scrim.ctaLabel !== 'Accept Scrim' && { color: '#e5e7eb' }]}>
          {scrim.ctaLabel}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={scrim.ctaLabel !== 'Accept Scrim' ? '#e5e7eb' : '#ffffff'}
        />
      </Pressable>
    </View>
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
          <Pressable
            style={[styles.filterButton, showFilters && styles.toggleActive]}
            onPress={() => setShowFilters((v) => !v)}
          >
            <Ionicons name="filter" size={18} color={showFilters ? '#60a5fa' : '#9ca3af'} />
            <Text style={[styles.filterButtonText, showFilters && { color: '#60a5fa' }]}>Filter</Text>
          </Pressable>

          <Pressable
            style={[styles.searchButton, showSearch && styles.toggleActive]}
            onPress={() => setShowSearch((v) => !v)}
          >
            <Ionicons name="search" size={18} color={showSearch ? '#60a5fa' : '#9ca3af'} />
            <Text style={[styles.searchButtonText, showSearch && { color: '#60a5fa' }]}>Search</Text>
          </Pressable>
        </View>

        {showSearch ? (
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#9ca3af" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search team, region, type…"
              placeholderTextColor="#6b7280"
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {showFilters ? (
          <View style={styles.filtersCard}>
            <View style={styles.filtersHeader}>
              <Text style={styles.filtersTitle}>Filters</Text>
              <Pressable onPress={clearFilters} hitSlop={10}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            </View>

            <Text style={styles.filtersLabel}>Region</Text>
            {renderPills(REGION_OPTIONS as any, filterRegion, setFilterRegion as any)}

            <Text style={styles.filtersLabel}>Scrim Type</Text>
            {renderPills(TYPE_OPTIONS as any, filterType, setFilterType as any)}

            <Text style={styles.filtersLabel}>My Scrims Status</Text>
            {renderPills(MY_STATUS_OPTIONS as any, filterMyStatus, setFilterMyStatus as any)}
          </View>
        ) : null}

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

        {/* My Scrims */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Scrims</Text>
            <Text style={styles.scrimCount}>{filteredMyScrims.length} shown</Text>
          </View>

          <View style={styles.scrimsList}>
            {!myTeamId ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No team set</Text>
                <Text style={styles.emptyText}>Create or select a team to track your scrims.</Text>
              </View>
            ) : filteredMyScrims.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No matches</Text>
                <Text style={styles.emptyText}>Try clearing filters or adjusting your search.</Text>
              </View>
            ) : (
              filteredMyScrims.map(renderScrimCard)
            )}
          </View>
        </View>

        {/* Available Scrims */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Scrims</Text>
            <Text style={styles.scrimCount}>{filteredOpenScrims.length} shown</Text>
          </View>

          <View style={styles.scrimsList}>
            {filteredOpenScrims.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No matches</Text>
                <Text style={styles.emptyText}>Try clearing filters or adjusting your search.</Text>
              </View>
            ) : (
              filteredOpenScrims.map(renderScrimCard)
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

  filterSection: { flexDirection: 'row', gap: 8, marginBottom: 12 },
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
  filterButtonText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
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
  searchButtonText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },

  toggleActive: {
    borderColor: 'rgba(96,165,250,0.55)',
    backgroundColor: 'rgba(96,165,250,0.08)',
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: '#e5e7eb', fontSize: 14, paddingVertical: 0 },

  filtersCard: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 12,
  },
  filtersHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  filtersTitle: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  clearText: { color: '#60a5fa', fontWeight: '800' },
  filtersLabel: { color: '#9ca3af', marginTop: 10, marginBottom: 8, fontSize: 12, fontWeight: '800' },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
  },
  pillSelected: {
    backgroundColor: 'rgba(59,130,246,0.16)',
    borderColor: 'rgba(59,130,246,0.55)',
  },
  pillText: { color: '#9ca3af', fontSize: 12, fontWeight: '800' },
  pillTextSelected: { color: '#60a5fa' },

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
  scrimCount: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },

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

  scrimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  scrimTypeContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  gameModeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  scrimType: { fontSize: 16, fontWeight: '700', color: '#ffffff' },

  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
  },
  rolePillText: { color: '#9ca3af', fontSize: 11, fontWeight: '900' },

  opponentLine: { color: '#9ca3af', fontSize: 12, marginTop: 4 },

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
