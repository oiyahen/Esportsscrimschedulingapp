import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Pressable, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

type UserSettingsRow = {
  user_id: string;
  scrim_confirmed: boolean;
  scrim_cancelled: boolean;
  allow_team_invites: boolean;
};

const DEFAULTS: Omit<UserSettingsRow, 'user_id'> = {
  scrim_confirmed: true,
  scrim_cancelled: true,
  allow_team_invites: true,
};

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [scrimConfirmed, setScrimConfirmed] = useState(DEFAULTS.scrim_confirmed);
  const [scrimCancelled, setScrimCancelled] = useState(DEFAULTS.scrim_cancelled);
  const [teamInvites, setTeamInvites] = useState(DEFAULTS.allow_team_invites);

  const load = async () => {
    try {
      setLoading(true);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const uid = sessionData.session?.user?.id ?? null;
      setUserId(uid);

      if (!uid) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('user_id, scrim_confirmed, scrim_cancelled, allow_team_invites')
        .eq('user_id', uid)
        .maybeSingle();

      if (error) {
        console.log('[Settings] fetch error:', error);
        setLoading(false);
        return;
      }

      // If missing, create defaults (no duplicates)
      if (!data?.user_id) {
        const payload: UserSettingsRow = {
          user_id: uid,
          ...DEFAULTS,
        };

        const { error: upErr } = await supabase
          .from('user_settings')
          .upsert(payload, { onConflict: 'user_id' });

        if (upErr) console.log('[Settings] upsert default error:', upErr);

        setScrimConfirmed(DEFAULTS.scrim_confirmed);
        setScrimCancelled(DEFAULTS.scrim_cancelled);
        setTeamInvites(DEFAULTS.allow_team_invites);
        setLoading(false);
        return;
      }

      setScrimConfirmed(!!data.scrim_confirmed);
      setScrimCancelled(!!data.scrim_cancelled);
      setTeamInvites(!!data.allow_team_invites);

      setLoading(false);
    } catch (e) {
      console.log('[Settings] load error:', e);
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    load();
  }, []);

  // Save on changes (after initial load)
  useEffect(() => {
    if (loading) return;
    if (!userId) return;

    const save = async () => {
      try {
        const payload: UserSettingsRow = {
          user_id: userId,
          scrim_confirmed: scrimConfirmed,
          scrim_cancelled: scrimCancelled,
          allow_team_invites: teamInvites,
        };

        const { error } = await supabase
          .from('user_settings')
          .upsert(payload, { onConflict: 'user_id' });

        if (error) console.log('[Settings] save error:', error);
      } catch (e) {
        console.log('[Settings] save exception:', e);
      }
    };

    save();
  }, [scrimConfirmed, scrimCancelled, teamInvites, userId, loading]);

  const rows = useMemo(
    () => [
      {
        title: 'Scrim confirmed alerts',
        desc: 'Get notified when a scrim is confirmed.',
        value: scrimConfirmed,
        onChange: setScrimConfirmed,
      },
      {
        title: 'Scrim cancelled alerts',
        desc: 'Get notified when a scrim is cancelled.',
        value: scrimCancelled,
        onChange: setScrimCancelled,
      },
      {
        title: 'Allow team invites',
        desc: 'Allow teams to invite you to join.',
        value: teamInvites,
        onChange: setTeamInvites,
      },
    ],
    [scrimConfirmed, scrimCancelled, teamInvites]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color="#94a3b8" />
        </Pressable>

        <Text style={styles.title}>General Settings</Text>

        <View style={{ width: 36, height: 36 }} />
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notifications & Privacy</Text>
          <Text style={styles.cardSub}>Preferences are saved to your account.</Text>

          <View style={{ marginTop: 12, gap: 12 }}>
            {rows.map((r) => (
              <View key={r.title} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{r.title}</Text>
                  <Text style={styles.rowDesc}>{r.desc}</Text>
                </View>

                <Switch
                  value={r.value}
                  onValueChange={r.onChange}
                  disabled={loading}
                  thumbColor={r.value ? '#e5e7eb' : '#94a3b8'}
                  trackColor={{ false: '#111827', true: '#1e3a8a' }}
                />
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>Pinnacle — Passion. Potential. Performance.</Text>
      </View>
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
  title: { flex: 1, color: '#e5e7eb', fontSize: 16, fontWeight: '800' },

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

  container: { flex: 1, padding: 16 },

  card: {
    backgroundColor: '#0b1220',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#111827',
  },
  cardTitle: { color: '#e5e7eb', fontSize: 14, fontWeight: '800' },
  cardSub: { color: '#64748b', fontSize: 12, marginTop: 6, lineHeight: 16 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
  },
  rowTitle: { color: '#e5e7eb', fontSize: 13, fontWeight: '700' },
  rowDesc: { color: '#94a3b8', fontSize: 12, marginTop: 2, lineHeight: 16 },

  footer: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 18 },
});
