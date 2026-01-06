import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';

type ScrimRow = {
  id: string;
  status: string;
  start_time: string;
  end_time: string;
  time_zone: string | null;
  region: string;
  scrim_type: string | null;
  host_team_id: string;
  opponent_team_id: string | null;

  host?: { name: string | null; tag: string | null } | null;
  opponent?: { name: string | null; tag: string | null } | null;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function getWeekDaysFor(anchor: Date) {
  // Monday as start of week
  const d = new Date(anchor);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diffToMon = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMon);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    days.push({
      day: x.toLocaleDateString(undefined, { weekday: 'short' }),
      date: String(x.getDate()),
      iso: x.toISOString(),
    });
  }

  const rangeLabel = `${days[0].day} ${days[0].date} - ${days[6].day} ${days[6].date}`;
  return { days, rangeLabel };
}

function formatTimeLocal(iso: string, tzLabel?: string | null) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const base = d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return tzLabel ? `${base} (${tzLabel})` : base;
}

function formatDayHeader(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function scrimTypeLabel(scrim_type: string | null) {
  const t = (scrim_type ?? '').toLowerCase();
  if (t === 'hp-only') return 'Hardpoint';
  if (t === 'snd-only') return 'S&D';
  if (t === 'third-only') return '3rd Mode';
  if (t === 'all-respawns') return 'Respawns';
  if (t === 'mixed') return 'Mixed';
  return 'Scrim';
}

export default function HomeScreen() {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [scrims, setScrims] = useState<ScrimRow[]>([]);

  // selected date drives the list + week/day interactions
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));

  // unread notifications badge (for the tile)
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const { days: weekDays, rangeLabel } = useMemo(() => getWeekDaysFor(selectedDate), [selectedDate]);

  const getStatusColor = (status: string) => {
    switch ((status ?? '').toLowerCase()) {
      case 'confirmed':
        return '#34d399';
      case 'pending':
        return '#fbbf24';
      case 'cancelled':
      case 'canceled':
        return '#f87171';
      case 'open':
        return '#60a5fa';
      default:
        return '#9ca3af';
    }
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

  const loadUnreadCount = useCallback(async (userId: string) => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) {
        console.log('[Home] unread count error:', error);
        return;
      }

      setUnreadCount(count ?? 0);
    } catch (e) {
      console.log('[Home] loadUnreadCount exception:', e);
    }
  }, []);

  const loadHome = useCallback(async () => {
    try {
      setLoading(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        setMyTeamId(null);
        setScrims([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      // refresh unread badge in the same load
      await loadUnreadCount(user.id);

      const { data: p, error: pErr } = await supabase
        .from('Profiles')
        .select('primary_team_id')
        .eq('id', user.id)
        .maybeSingle();

      if (pErr) throw pErr;

      const teamId = p?.primary_team_id ?? null;
      setMyTeamId(teamId);

      if (!teamId) {
        setScrims([]);
        setLoading(false);
        return;
      }

      const { data: s, error: sErr } = await supabase
        .from('scrims')
        .select(
          `
          id,
          status,
          start_time,
          end_time,
          time_zone,
          region,
          scrim_type,
          host_team_id,
          opponent_team_id,
          host:teams!scrims_host_team_id_fkey(name, tag),
          opponent:teams!scrims_opponent_team_id_fkey(name, tag)
        `
        )
        .or(`host_team_id.eq.${teamId},opponent_team_id.eq.${teamId}`)
        .in('status', ['confirmed', 'pending', 'open'])
        .order('start_time', { ascending: true })
        .limit(50);

      if (sErr) throw sErr;

      setScrims((s ?? []) as any);
      setLoading(false);
    } catch (e) {
      console.log('[Home] load error:', e);
      setScrims([]);
      setLoading(false);
    }
  }, [loadUnreadCount]);

  // Initial load + auth change reload
  useEffect(() => {
    loadHome();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadHome();
    });

    return () => sub.subscription.unsubscribe();
  }, [loadHome]);

  // Keep the Notifications quick-action badge fresh when returning to Home
  useFocusEffect(
    useCallback(() => {
      loadHome();
    }, [loadHome])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHome();
    setRefreshing(false);
  };

  const uiScrims = useMemo(() => {
    return scrims.map((s) => {
      const type = scrimTypeLabel(s.scrim_type);
      const start = new Date(s.start_time);

      const opponentName =
        myTeamId && s.host_team_id === myTeamId
          ? s.opponent?.name ?? 'TBD'
          : s.host?.name ?? 'TBD';

      return {
        id: s.id,
        status: (s.status ?? '').toLowerCase(),
        startDate: start,
        timeLabel: formatTimeLocal(s.start_time, s.time_zone),
        opponent: opponentName,
        gameMode: type,
      };
    });
  }, [scrims, myTeamId]);

  // Filter list by selectedDate (works for past/future)
  const selectedDayScrims = useMemo(() => {
    const d0 = startOfDay(selectedDate);
    return uiScrims.filter((s) => !Number.isNaN(s.startDate.getTime()) && sameDay(s.startDate, d0));
  }, [uiScrims, selectedDate]);

  const listTitle = formatDayHeader(selectedDate);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Top Brand Bar */}
        <View style={styles.brandBar}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <View style={styles.logoInner} />
            </View>
            <View>
              <Text style={styles.brandTitle}>Scrim Center</Text>
              <Text style={styles.brandSlogan}>The Scrim OS for Challengers</Text>
            </View>
          </View>
        </View>

        {/* Header with Toggle */}
        <View style={styles.headerSection}>
          <View>
            <Text style={styles.headerTitle}>Team Calendar</Text>
            <Text style={styles.headerSubtitle}>Your upcoming scrims and schedule</Text>
          </View>

          <View style={styles.toggleContainer}>
            <Pressable
              onPress={() => setViewMode('day')}
              style={[styles.toggleButton, viewMode === 'day' && styles.toggleButtonActive]}
            >
              <Text style={[styles.toggleText, viewMode === 'day' && styles.toggleTextActive]}>Day</Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode('week')}
              style={[styles.toggleButton, viewMode === 'week' && styles.toggleButtonActive]}
            >
              <Text style={[styles.toggleText, viewMode === 'week' && styles.toggleTextActive]}>Week</Text>
            </Pressable>
          </View>
        </View>

        {/* Calendar Card */}
        <View style={styles.calendarCard}>
          {viewMode === 'week' ? (
            <>
              <View style={styles.weekHeader}>
                <Text style={styles.weekLabel}>This Week</Text>
                <Text style={styles.weekDate}>{rangeLabel}</Text>
              </View>

              <View style={styles.daysRow}>
                {weekDays.map((dayItem) => {
                  const dayDate = startOfDay(new Date(dayItem.iso));
                  const isToday = sameDay(dayDate, startOfDay(new Date()));
                  const isSelected = sameDay(dayDate, startOfDay(selectedDate));

                  return (
                    <Pressable
                      key={dayItem.iso}
                      style={[
                        styles.dayCard,
                        isToday && styles.dayCardToday,
                        isSelected && styles.dayCardSelected,
                      ]}
                      onPress={() => setSelectedDate(dayDate)}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isToday && styles.dayTextToday,
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {dayItem.day}
                      </Text>
                      <Text
                        style={[
                          styles.dateText,
                          isToday && styles.dateTextToday,
                          isSelected && styles.dateTextSelected,
                        ]}
                      >
                        {dayItem.date}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              {/* Day view date navigator */}
              <View style={styles.dayHeaderRow}>
                <Pressable
                  style={styles.dayNavBtn}
                  onPress={() => setSelectedDate((prev) => startOfDay(addDays(prev, -1)))}
                >
                  <Ionicons name="chevron-back" size={18} color="#e5e7eb" />
                </Pressable>

                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={styles.weekLabel}>Selected Day</Text>
                  <Text style={styles.weekDate}>{formatDayHeader(selectedDate)}</Text>
                </View>

                <Pressable
                  style={styles.dayNavBtn}
                  onPress={() => setSelectedDate((prev) => startOfDay(addDays(prev, 1)))}
                >
                  <Ionicons name="chevron-forward" size={18} color="#e5e7eb" />
                </Pressable>
              </View>
            </>
          )}

          {/* Scrims Section */}
          <View style={styles.scrimsSection}>
            <View style={styles.scrimsSectionHeader}>
              <Text style={styles.scrimsTitle}>{listTitle}</Text>
              <Text style={styles.scrimsCount}>
                {loading
                  ? 'Loading…'
                  : `${selectedDayScrims.length} scrim${
                      selectedDayScrims.length === 1 ? '' : 's'
                    }`}
              </Text>
            </View>

            {loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 18 }}>
                <ActivityIndicator />
                <Text style={{ color: '#9ca3af', marginTop: 10 }}>Loading scrims…</Text>
              </View>
            ) : myTeamId ? (
              <View style={styles.scrimsList}>
                {selectedDayScrims.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No scrims scheduled</Text>
                    <Text style={styles.emptyText}>
                      Nothing on the calendar for this day yet. Post a slot or find an opponent.
                    </Text>

                    <View style={{ gap: 10 }}>
                      <Pressable style={styles.primaryCta} onPress={() => router.push('/create-scrim')}>
                        <Ionicons name="add-circle" size={18} color="#fff" />
                        <Text style={styles.primaryCtaText}>Post Scrim Slot</Text>
                      </Pressable>

                      <Pressable style={styles.secondaryCta} onPress={() => router.push('/(tabs)/scrim_center')}>
                        <Ionicons name="search" size={18} color="#e5e7eb" />
                        <Text style={styles.secondaryCtaText}>Find Opponent</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  selectedDayScrims.map((scrim) => (
                    <Pressable
                      key={scrim.id}
                      style={({ pressed }) => [styles.scrimSlot, pressed && styles.scrimSlotPressed]}
                      onPress={() => router.push(`/scrim-details?id=${scrim.id}`)}
                    >
                      <View style={styles.timeBadge}>
                        <Ionicons name="time" size={14} color="#60a5fa" />
                        <Text style={styles.timeText}>{scrim.timeLabel}</Text>
                      </View>

                      <View style={styles.scrimInfo}>
                        <View style={styles.scrimHeaderRow}>
                          <View style={styles.gameModeContainer}>
                            <View style={styles.gameModeIcon}>
                              <Ionicons
                                name={getGameModeIcon(scrim.gameMode) as any}
                                size={14}
                                color="#60a5fa"
                              />
                            </View>
                            <Text style={styles.opponentText}>{scrim.opponent}</Text>
                          </View>

                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: `${getStatusColor(scrim.status)}20` },
                            ]}
                          >
                            <View
                              style={[styles.statusDot, { backgroundColor: getStatusColor(scrim.status) }]}
                            />
                            <Text style={[styles.statusText, { color: getStatusColor(scrim.status) }]}>
                              {scrim.status.charAt(0).toUpperCase() + scrim.status.slice(1)}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.mapText}>{scrim.gameMode}</Text>
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Primary team not set</Text>
                <Text style={styles.emptyText}>Set a primary team in Profile to see your scrim calendar.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <Pressable style={styles.actionCard} onPress={() => router.push('/create-scrim')}>
              <Ionicons name="add-circle" size={24} color="#60a5fa" />
              <Text style={styles.actionText}>Post Scrim</Text>
            </Pressable>

            <Pressable style={styles.actionCard} onPress={() => router.push('/(tabs)/scrim-center')}>
              <Ionicons name="search" size={24} color="#34d399" />
              <Text style={styles.actionText}>Find Opponent</Text>
            </Pressable>

            <Pressable style={styles.actionCard} onPress={() => router.push('/(tabs)/my_team')}>
              <Ionicons name="people" size={24} color="#a78bfa" />
              <Text style={styles.actionText}>My Team</Text>
            </Pressable>

            {/* Notifications tile + badge */}
            <Pressable style={styles.actionCard} onPress={() => router.push('/notifications')}>
              <View style={{ position: 'relative' }}>
                <Ionicons name="notifications" size={24} color="#60a5fa" />
                {unreadCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : String(unreadCount)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.actionText}>Notifications</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.footer}>Pinnacle — Passion. Potential. Performance.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 },

  brandBar: { marginBottom: 10 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: { width: 14, height: 14, borderRadius: 4, backgroundColor: '#3b82f6' },
  brandTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  brandSlogan: { color: '#9ca3af', fontSize: 12, marginTop: 1 },

  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: '#9ca3af', fontSize: 12, marginTop: 2 },

  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 12,
    overflow: 'hidden',
  },
  toggleButton: { paddingVertical: 8, paddingHorizontal: 12 },
  toggleButtonActive: { backgroundColor: '#1f2937' },
  toggleText: { color: '#9ca3af', fontSize: 12, fontWeight: '700' },
  toggleTextActive: { color: '#fff' },

  calendarCard: {
    backgroundColor: '#111113',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
  },

  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  weekLabel: { color: '#fff', fontSize: 14, fontWeight: '800' },
  weekDate: { color: '#9ca3af', fontSize: 12 },

  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  dayNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },

  daysRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  dayCard: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dayCardToday: { borderColor: '#3b82f6', backgroundColor: '#0b1e3a' },
  dayCardSelected: { borderColor: '#60a5fa', backgroundColor: '#0b1220' },

  dayText: { color: '#9ca3af', fontSize: 12, fontWeight: '700' },
  dayTextToday: { color: '#bfdbfe' },
  dayTextSelected: { color: '#e5e7eb' },

  dateText: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: 2 },
  dateTextToday: { color: '#fff' },
  dateTextSelected: { color: '#fff' },

  scrimsSection: { marginTop: 8 },
  scrimsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scrimsTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  scrimsCount: { color: '#9ca3af', fontSize: 12 },

  scrimsList: { marginTop: 10, gap: 10 },
  scrimSlot: {
    backgroundColor: '#1a1a1b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 12,
  },
  scrimSlotPressed: { borderColor: '#3b82f6', backgroundColor: '#222223' },

  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  timeText: { color: '#bfdbfe', fontSize: 12, fontWeight: '700' },

  scrimInfo: { gap: 6 },
  scrimHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  gameModeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gameModeIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  opponentText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  mapText: { color: '#9ca3af', fontSize: 12 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '800' },

  emptyCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 14,
    padding: 14,
  },
  emptyTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  emptyText: { color: '#9ca3af', fontSize: 12, marginTop: 4, marginBottom: 12 },

  primaryCta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  secondaryCta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryCtaText: { color: '#e5e7eb', fontWeight: '800', fontSize: 13 },

  actionsSection: { marginTop: 16 },
  actionsTitle: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 10 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  actionCard: {
    flexGrow: 1,
    flexBasis: '48%',
    backgroundColor: '#111113',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  actionText: { color: '#e5e7eb', fontSize: 12, fontWeight: '800' },

  // Badge for notifications tile
  badge: {
    position: 'absolute',
    top: -8,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: '#050814',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  footer: { color: '#6b7280', fontSize: 12, textAlign: 'center', marginTop: 18 },
});
