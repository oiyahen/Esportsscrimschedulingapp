import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { supabase } from '../../lib/supabase';

type ProfileRow = {
  id: string;
  username: string | null;
  handle: string | null;
  email: string | null;
  primary_region: string | null;
  primary_team_id: string | null;
  created_at: string | null;
};

type ScrimRow = {
  id: string;
  host_team_id: string;
  status: string;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
};

const REGION_LABELS: Record<string, string> = {
  'pacific-nw': 'Pacific Northwest',
  'pacific-sw': 'Pacific Southwest',
  'central-north': 'Central North',
  'central-south': 'Central South',
  'atlantic-north': 'Atlantic North',
  'atlantic-south': 'Atlantic South',
};

function minutesBetween(startISO: string, endISO: string) {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  const diffMs = end - start;
  if (!Number.isFinite(diffMs)) return 0;
  return Math.max(0, Math.round(diffMs / 60000));
}

export default function ProfileScreen() {
  const navigation = useNavigation();

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileRow, setProfileRow] = useState<ProfileRow | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);

  // Stats state
  const [scrimsCount, setScrimsCount] = useState<number>(0);
  const [confirmedCount, setConfirmedCount] = useState<number>(0);
  const [confirmedHours, setConfirmedHours] = useState<number>(0);

  const profile = useMemo(() => {
    const createdAt = profileRow?.created_at ? new Date(profileRow.created_at) : null;
    const memberSince = createdAt
      ? createdAt.toLocaleString(undefined, { month: 'long', year: 'numeric' })
      : '—';

    const regionLabel = profileRow?.primary_region
      ? REGION_LABELS[profileRow.primary_region] ?? profileRow.primary_region
      : 'Not set';

    const handle =
      profileRow?.handle && profileRow.handle.length > 0
        ? profileRow.handle.startsWith('@')
          ? profileRow.handle
          : `@${profileRow.handle}`
        : '—';

    return {
      username: profileRow?.username ?? '—',
      handle,
      email: profileRow?.email ?? '—',
      region: regionLabel,
      memberSince,
      currentTeam: teamName ?? '—',
      tier: '—', // placeholder for now
      role: '—', // placeholder for now
    };
  }, [profileRow, teamName]);

  const stats = useMemo(
    () => [
      { label: 'Scrims', value: String(scrimsCount) },
      { label: 'Confirmed', value: String(confirmedCount) },
      { label: 'Teams', value: '1' }, // placeholder until team_members is wired
      { label: 'Hours', value: confirmedHours.toFixed(1) },
    ],
    [scrimsCount, confirmedCount, confirmedHours]
  );

 const settingsItems = useMemo(
  () => [
    { icon: 'people-outline' as const, label: 'Teams', color: '#fbbf24' }, // NEW placeholder
    { icon: 'notifications-outline' as const, label: 'Notifications', color: '#60a5fa' },
    { icon: 'shield-checkmark-outline' as const, label: 'Privacy & Security', color: '#a78bfa' },
    { icon: 'location-outline' as const, label: 'Change Region', color: '#34d399' },
    { icon: 'log-out-outline' as const, label: 'Sign Out', color: '#f87171' },
  ],
  []
);


  const loadTeamScrimStats = async (teamId: string) => {
    try {
      // Pull scrims hosted by this team (latest 200 is plenty for now)
      const { data, error } = await supabase
        .from('scrims')
        .select('id, host_team_id, status, start_time, end_time, duration_minutes')
        .eq('host_team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const rows: ScrimRow[] = (data ?? []) as any;

      const total = rows.length;
      const confirmed = rows.filter((s) => (s.status ?? '').toLowerCase() === 'confirmed');

      const confirmedMinutes = confirmed.reduce((acc, s) => {
        if (typeof s.duration_minutes === 'number' && Number.isFinite(s.duration_minutes)) {
          return acc + Math.max(0, s.duration_minutes);
        }
        return acc + minutesBetween(s.start_time, s.end_time);
      }, 0);

      setScrimsCount(total);
      setConfirmedCount(confirmed.length);
      setConfirmedHours(Math.round((confirmedMinutes / 60) * 10) / 10);
    } catch (e) {
      console.log('Scrim stats load error:', e);
      // Don’t blank UI aggressively; just set safe defaults
      setScrimsCount(0);
      setConfirmedCount(0);
      setConfirmedHours(0);
    }
  };

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        setProfileRow(null);
        setTeamName(null);
        setScrimsCount(0);
        setConfirmedCount(0);
        setConfirmedHours(0);
        setLoadingProfile(false);
        return;
      }

      const { data: p, error: pErr } = await supabase
        .from('Profiles')
        .select('id, username, handle, email, primary_region, primary_team_id, created_at')
        .eq('id', user.id)
        .maybeSingle();

      if (pErr) throw pErr;

      let tName: string | null = null;

      if (p?.primary_team_id) {
        const { data: t, error: tErr } = await supabase
          .from('teams')
          .select('name')
          .eq('id', p.primary_team_id)
          .maybeSingle();

        if (!tErr) tName = t?.name ?? null;

        // Load stats for this team
        await loadTeamScrimStats(p.primary_team_id);
      } else {
        // No team set yet
        setScrimsCount(0);
        setConfirmedCount(0);
        setConfirmedHours(0);
      }

      setProfileRow((p ?? null) as any);
      setTeamName(tName);
      setLoadingProfile(false);
    } catch (e) {
      console.log('Profile load error:', e);
      setProfileRow(null);
      setTeamName(null);
      setScrimsCount(0);
      setConfirmedCount(0);
      setConfirmedHours(0);
      setLoadingProfile(false);
    }
  };

  // Initial load + refresh on auth change
  useEffect(() => {
    loadProfile();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh whenever this screen becomes focused again (returning from /region)
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      loadProfile();
    });

    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  const onPressSetting = async (label: string) => {
    if (label === 'Sign Out') {
      await supabase.auth.signOut();
      router.replace('/');
      return;
    }

    if (label === 'Change Region') {
      router.push('/region');
      return;
    }

    if (label === 'Teams') {
  router.push('/teams');
  return;
}


    console.log('TODO:', label);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color="#0b1220" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.username}>{profile.username}</Text>
            <Text style={styles.handle}>{profile.handle}</Text>
          </View>

          {loadingProfile ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Loading</Text>
            </View>
          ) : null}
        </View>

        {/* Profile card */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="mail-outline" size={18} color="#94a3b8" />
            <Text style={styles.rowText}>{profile.email}</Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="location-outline" size={18} color="#94a3b8" />
            <Text style={styles.rowText}>{profile.region}</Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
            <Text style={styles.rowText}>Member Since {profile.memberSince}</Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="people-outline" size={18} color="#94a3b8" />
            <Text style={styles.rowText}>Team: {profile.currentTeam}</Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="trophy-outline" size={18} color="#94a3b8" />
            <Text style={styles.rowText}>Tier: {profile.tier}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Settings */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsCard}>
          {settingsItems.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.settingRow, pressed && styles.settingRowPressed]}
              onPress={() => onPressSetting(item.label)}
            >
              <View style={[styles.settingIconWrap, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>

              <Text style={styles.settingLabel}>{item.label}</Text>

              <Ionicons name="chevron-forward" size={18} color="#64748b" />
            </Pressable>
          ))}
        </View>

        <Text style={styles.footer}>Pinnacle — Passion. Potential. Performance.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050814' },
  container: { padding: 16, paddingBottom: 28 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: { color: '#e5e7eb', fontSize: 18, fontWeight: '700' },
  handle: { color: '#94a3b8', fontSize: 13, marginTop: 2 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  badgeText: { color: '#94a3b8', fontSize: 12 },

  card: {
    backgroundColor: '#0b1220',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#111827',
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { color: '#e5e7eb', fontSize: 13 },

  statsGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '48%',
    backgroundColor: '#0b1220',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#111827',
  },
  statValue: { color: '#e5e7eb', fontSize: 18, fontWeight: '700' },
  statLabel: { color: '#94a3b8', fontSize: 12, marginTop: 4 },

  sectionTitle: { color: '#e5e7eb', fontSize: 14, fontWeight: '700', marginTop: 18, marginBottom: 10 },

  settingsCard: {
    backgroundColor: '#0b1220',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#111827',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
  },
  settingRowPressed: { opacity: 0.8 },
  settingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { flex: 1, color: '#e5e7eb', fontSize: 13, fontWeight: '600' },

  footer: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 18 },
});
