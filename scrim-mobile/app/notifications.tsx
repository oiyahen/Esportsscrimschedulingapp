import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Pressable, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

type LocalSettings = {
  scrim_confirmed: boolean;
  scrim_cancelled: boolean;
  allow_team_invites: boolean;
};

type NotifType = 'scrim_confirmed' | 'scrim_cancelled' | 'team_invite';

type NotificationRow = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

const DEFAULT_SETTINGS: LocalSettings = {
  scrim_confirmed: true,
  scrim_cancelled: true,
  allow_team_invites: true,
};

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const diff = Date.now() - t;
  const mins = Math.max(0, Math.round(diff / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function iconForType(type: NotifType): { icon: any; color: string; bg: string } {
  switch (type) {
    case 'scrim_confirmed':
      return { icon: 'checkmark-circle', color: '#34d399', bg: '#052016' };
    case 'scrim_cancelled':
      return { icon: 'close-circle', color: '#f87171', bg: '#20090a' };
    case 'team_invite':
      return { icon: 'people', color: '#60a5fa', bg: '#06182b' };
    default:
      return { icon: 'notifications', color: '#94a3b8', bg: '#0b1220' };
  }
}

export default function NotificationsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<LocalSettings>(DEFAULT_SETTINGS);
  const [rows, setRows] = useState<NotificationRow[]>([]);

  const loadAll = async () => {
    try {
      setLoading(true);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const uid = sessionData.session?.user?.id ?? null;
      setUserId(uid);

      if (!uid) {
        setRows([]);
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
        return;
      }

      // Load user settings (fallback to defaults if missing)
      const { data: s, error: sErr } = await supabase
        .from('user_settings')
        .select('scrim_confirmed, scrim_cancelled, allow_team_invites')
        .eq('user_id', uid)
        .maybeSingle();

      if (sErr) console.log('[Notifications] settings fetch error:', sErr);

      setSettings({
        scrim_confirmed: typeof s?.scrim_confirmed === 'boolean' ? s.scrim_confirmed : DEFAULT_SETTINGS.scrim_confirmed,
        scrim_cancelled: typeof s?.scrim_cancelled === 'boolean' ? s.scrim_cancelled : DEFAULT_SETTINGS.scrim_cancelled,
        allow_team_invites:
          typeof s?.allow_team_invites === 'boolean' ? s.allow_team_invites : DEFAULT_SETTINGS.allow_team_invites,
      });

      // Load notifications
      const { data: n, error: nErr } = await supabase
        .from('notifications')
        .select('id, type, title, body, created_at, read_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50);

      if (nErr) {
        console.log('[Notifications] fetch error:', nErr);
        setRows([]);
        setLoading(false);
        return;
      }

      setRows((n ?? []) as any);
      setLoading(false);
    } catch (e) {
      console.log('[Notifications] load error:', e);
      setRows([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((n) => {
      if (n.type === 'scrim_confirmed') return settings.scrim_confirmed;
      if (n.type === 'scrim_cancelled') return settings.scrim_cancelled;
      if (n.type === 'team_invite') return settings.allow_team_invites;
      return true;
    });
  }, [rows, settings]);

  const unreadCount = useMemo(() => filtered.filter((n) => !n.read_at).length, [filtered]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    if (!userId) return;

    const unreadIds = filtered.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: now })
      .in('id', unreadIds);

    if (error) console.log('[Notifications] markAllRead error:', error);

    await loadAll();
  };

  const clearAll = async () => {
    if (!userId) return;

    const { error } = await supabase.from('notifications').delete().eq('user_id', userId);
    if (error) console.log('[Notifications] clear error:', error);

    await loadAll();
  };

  const markOneRead = async (id: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from('notifications').update({ read_at: now }).eq('id', id);
    if (error) console.log('[Notifications] markOneRead error:', error);
    await loadAll();
  };

  const openSettings = () => router.push('/settings');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <Ionicons name="chevron-back" size={20} color="#94a3b8" />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            {loading ? 'Loading…' : unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Text>
        </View>

        <Pressable
          onPress={openSettings}
          hitSlop={10}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <Ionicons name="settings-outline" size={20} color="#94a3b8" />
        </Pressable>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={markAllRead}
          disabled={filtered.length === 0 || unreadCount === 0}
          style={({ pressed }) => [
            styles.actionPill,
            (filtered.length === 0 || unreadCount === 0) && styles.actionPillDisabled,
            pressed && !(filtered.length === 0 || unreadCount === 0) && styles.actionPillPressed,
          ]}
        >
          <Ionicons name="checkmark-done-outline" size={16} color="#94a3b8" />
          <Text style={styles.actionText}>Mark all read</Text>
        </Pressable>

        <Pressable
          onPress={clearAll}
          disabled={filtered.length === 0}
          style={({ pressed }) => [
            styles.actionPill,
            filtered.length === 0 && styles.actionPillDisabled,
            pressed && filtered.length > 0 && styles.actionPillPressed,
          ]}
        >
          <Ionicons name="trash-outline" size={16} color="#94a3b8" />
          <Text style={styles.actionText}>Clear</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-outline" size={22} color="#94a3b8" />
            </View>

            <Text style={styles.emptyTitle}>Nothing here</Text>
            <Text style={styles.emptyText}>
              Your settings may be filtering notifications, or you haven’t received any yet.
            </Text>

            <Pressable
              onPress={openSettings}
              style={({ pressed }) => [styles.primaryCta, pressed && styles.primaryCtaPressed]}
            >
              <Ionicons name="options-outline" size={18} color="#e5e7eb" />
              <Text style={styles.primaryCtaText}>Open Settings</Text>
            </Pressable>

            <Text style={styles.footer}>Pinnacle — Passion. Potential. Performance.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((n) => {
              const meta = iconForType(n.type);
              const isRead = !!n.read_at;

              return (
                <View key={n.id} style={[styles.card, !isRead && styles.cardUnread]}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.typeIconWrap, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={18} color={meta.color} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.titleRow}>
                        <Text style={styles.cardTitle}>{n.title}</Text>
                        {!isRead ? <View style={styles.unreadDot} /> : null}
                      </View>
                      <Text style={styles.cardBody}>{n.body}</Text>
                    </View>

                    <Text style={styles.timeAgo}>{timeAgo(n.created_at)}</Text>
                  </View>

                  <View style={styles.cardBottomRow}>
                    <Text style={styles.muted}>
                      {new Date(n.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>

                    <Pressable
                      onPress={() => markOneRead(n.id)}
                      disabled={isRead}
                      style={({ pressed }) => [
                        styles.smallBtn,
                        isRead && styles.smallBtnDisabled,
                        pressed && !isRead && styles.smallBtnPressed,
                      ]}
                    >
                      <Text style={[styles.smallBtnText, isRead && styles.smallBtnTextDisabled]}>
                        {isRead ? 'Read' : 'Mark read'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050814' },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: { color: '#e5e7eb', fontSize: 16, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
  },
  iconButtonPressed: { opacity: 0.85 },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
  },
  actionPillPressed: { opacity: 0.85 },
  actionPillDisabled: { opacity: 0.5 },
  actionText: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },

  container: { padding: 16, paddingBottom: 28 },

  emptyCard: {
    flex: 1,
    backgroundColor: '#0b1220',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 420,
  },
  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#050814',
    borderWidth: 1,
    borderColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { color: '#e5e7eb', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  emptyText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 18, maxWidth: 320 },

  primaryCta: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  primaryCtaPressed: { opacity: 0.85 },
  primaryCtaText: { color: '#e5e7eb', fontSize: 13, fontWeight: '800' },

  footer: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 16 },

  card: {
    backgroundColor: '#0b1220',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#111827',
  },
  cardUnread: { borderColor: '#1f3b6b' },

  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  typeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#111827',
  },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: '#e5e7eb', fontSize: 13, fontWeight: '900' },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#60a5fa' },

  cardBody: { color: '#94a3b8', fontSize: 12, marginTop: 4, lineHeight: 16 },
  timeAgo: { color: '#64748b', fontSize: 12, marginLeft: 6 },

  cardBottomRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muted: { color: '#64748b', fontSize: 12 },

  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#050814',
    borderWidth: 1,
    borderColor: '#111827',
  },
  smallBtnPressed: { opacity: 0.85 },
  smallBtnDisabled: { opacity: 0.6 },

  smallBtnText: { color: '#e5e7eb', fontSize: 12, fontWeight: '800' },
  smallBtnTextDisabled: { color: '#94a3b8' },
});
