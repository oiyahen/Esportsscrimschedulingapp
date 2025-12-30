import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

type RegionId =
  | 'pacific-nw'
  | 'pacific-sw'
  | 'central-north'
  | 'central-south'
  | 'atlantic-north'
  | 'atlantic-south';

const REGION_LABELS: Record<RegionId, string> = {
  'pacific-nw': 'Pacific Northwest',
  'pacific-sw': 'Pacific Southwest',
  'central-north': 'Central North',
  'central-south': 'Central South',
  'atlantic-north': 'Atlantic North',
  'atlantic-south': 'Atlantic South',
};

const REGION_OPTIONS: { id: RegionId; label: string }[] = Object.entries(REGION_LABELS).map(([id, label]) => ({
  id: id as RegionId,
  label,
}));

function guessTZ() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  } catch {
    return 'America/New_York';
  }
}

export default function CreateTeamScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [region, setRegion] = useState<RegionId>('atlantic-north');
  const [timeZone, setTimeZone] = useState<string>(guessTZ());

  const [userId, setUserId] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return teamName.trim().length >= 3 && teamTag.trim().length >= 2 && !!region && !!timeZone;
  }, [teamName, teamTag, region, timeZone]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const user = sessionData.session?.user;
        if (!user) {
          if (mounted) {
            setUserId(null);
            setLoading(false);
          }
          return;
        }

        setUserId(user.id);

        // Default region from Profile if available
        const { data: p, error: pErr } = await supabase
          .from('Profiles')
          .select('primary_region')
          .eq('id', user.id)
          .maybeSingle();

        if (!pErr && p?.primary_region) {
          setRegion(p.primary_region as RegionId);
        }

        setLoading(false);
      } catch (e) {
        console.log('[CreateTeam] init error:', e);
        setLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  const onCreate = async () => {
    if (!userId) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    if (!canSubmit) {
      Alert.alert('Missing info', 'Please enter a team name and tag.');
      return;
    }

    try {
      setSaving(true);

      // 1) Create team
      const { data: createdTeam, error: teamErr } = await supabase
        .from('teams')
        .insert({
          owner_id: userId,
          name: teamName.trim(),
          tag: teamTag.trim().toUpperCase(),
          region,
          time_zone: timeZone,
        })
        .select('id')
        .single();

      if (teamErr) throw teamErr;

      const teamId = createdTeam.id as string;

      // 2) Ensure owner is a member (fixes the “owner not in members” issue long-term)
      const { error: memberErr } = await supabase.from('team_members').insert({
        team_id: teamId,
        user_id: userId,
        status: 'active',
      });

      // If it already exists (unique constraint), ignore
      if (memberErr && !String(memberErr.message || '').toLowerCase().includes('duplicate')) {
        // Note: supabase error text varies; we only ignore duplicate-ish errors
        console.log('[CreateTeam] member insert error:', memberErr);
      }

      // 3) Set profile primary team
      const { error: profErr } = await supabase.from('Profiles').update({ primary_team_id: teamId }).eq('id', userId);

      if (profErr) throw profErr;

      // 4) Go to My Team tab
      router.replace('/(tabs)/my_team');
    } catch (e: any) {
      console.log('[CreateTeam] create error:', e);
      Alert.alert('Could not create team', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color="#e5e7eb" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Create Team</Text>
            <Text style={styles.subtitle}>Set up your team to start scrimming</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading…</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Team Name</Text>
            <TextInput
              value={teamName}
              onChangeText={setTeamName}
              placeholder="e.g. Pinnacle Academy"
              placeholderTextColor="#6b7280"
              style={styles.input}
              autoCapitalize="words"
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Team Tag</Text>
            <TextInput
              value={teamTag}
              onChangeText={setTeamTag}
              placeholder="e.g. PNC"
              placeholderTextColor="#6b7280"
              style={styles.input}
              autoCapitalize="characters"
              maxLength={6}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Region</Text>
            <View style={styles.selectBox}>
              {REGION_OPTIONS.map((opt) => {
                const selected = opt.id === region;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setRegion(opt.id)}
                    style={[styles.pill, selected && styles.pillSelected]}
                  >
                    <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Time Zone</Text>
            <TextInput
              value={timeZone}
              onChangeText={setTimeZone}
              placeholder="America/New_York"
              placeholderTextColor="#6b7280"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              disabled={!canSubmit || saving}
              onPress={onCreate}
              style={[styles.primaryBtn, (!canSubmit || saving) && { opacity: 0.6 }]}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create Team</Text>}
            </Pressable>
          </View>
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

  card: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },

  label: { color: '#e5e7eb', fontSize: 12, fontWeight: '800' },
  input: {
    marginTop: 8,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#e5e7eb',
    fontSize: 14,
  },

  selectBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
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

  primaryBtn: {
    marginTop: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },

  footer: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 18 },
});
