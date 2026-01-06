import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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

type TeamRow = {
  id: string;
  owner_id: string;
  name: string;
  tag: string | null;
  region: string;
  time_zone: string | null;
};

export default function CreateTeamScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const teamIdParam = typeof params?.id === 'string' ? params.id : null;

  const isEditMode = !!teamIdParam;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [region, setRegion] = useState<RegionId>('atlantic-north');
  const [timeZone, setTimeZone] = useState<string>(guessTZ());

  const [userId, setUserId] = useState<string | null>(null);
  const [loadedTeam, setLoadedTeam] = useState<TeamRow | null>(null);

  const canSubmit = useMemo(() => {
    return teamName.trim().length >= 3 && teamTag.trim().length >= 2 && !!region && !!timeZone;
  }, [teamName, teamTag, region, timeZone]);

  const isOwner = useMemo(() => {
    if (!isEditMode) return false;
    if (!loadedTeam || !userId) return false;
    return loadedTeam.owner_id === userId;
  }, [isEditMode, loadedTeam, userId]);

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

        if (!pErr && p?.primary_region && !isEditMode) {
          setRegion(p.primary_region as RegionId);
        }

        // If editing, load the team and prefill fields
        if (isEditMode && teamIdParam) {
          const { data: t, error: tErr } = await supabase
            .from('teams')
            .select('id, owner_id, name, tag, region, time_zone')
            .eq('id', teamIdParam)
            .maybeSingle();

          if (tErr) throw tErr;

          if (!t) {
            // team not found or not accessible via RLS
            if (mounted) {
              setLoadedTeam(null);
              setLoading(false);
            }
            Alert.alert('Team not found', 'This team may not exist or you may not have access.');
            router.back();
            return;
          }

          if (mounted) {
            setLoadedTeam(t as any);
            setTeamName(t.name ?? '');
            setTeamTag((t.tag ?? '').toString());
            setRegion((t.region ?? 'atlantic-north') as RegionId);
            setTimeZone((t.time_zone ?? guessTZ()).toString());
          }
        }

        if (mounted) setLoading(false);
      } catch (e) {
        console.log('[CreateTeam] init error:', e);
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, [isEditMode, teamIdParam]);

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

      // 2) Ensure owner is a member
      const { error: memberErr } = await supabase.from('team_members').insert({
        team_id: teamId,
        user_id: userId,
        status: 'active',
      });

      if (memberErr && !String(memberErr.message || '').toLowerCase().includes('duplicate')) {
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

  const onSaveChanges = async () => {
    if (!userId) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }
    if (!teamIdParam) return;

    if (!canSubmit) {
      Alert.alert('Missing info', 'Please enter a team name and tag.');
      return;
    }

    try {
      setSaving(true);

      // Only owner can update team (safety check in query)
      const { data: updated, error } = await supabase
        .from('teams')
        .update({
          name: teamName.trim(),
          tag: teamTag.trim().toUpperCase(),
          region,
          time_zone: timeZone,
        })
        .eq('id', teamIdParam)
        .eq('owner_id', userId)
        .select('id, owner_id, name, tag, region, time_zone')
        .maybeSingle();

      if (error) throw error;

      if (!updated?.id) {
        Alert.alert('Not allowed', 'Only the team owner can edit this team.');
        return;
      }

      setLoadedTeam(updated as any);
      Alert.alert('Saved', 'Team updated successfully.');
      router.back();
    } catch (e: any) {
      console.log('[CreateTeam] save error:', e);
      Alert.alert('Could not save', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteTeam = async () => {
    if (!userId || !teamIdParam) return;

    Alert.alert(
      'Delete team?',
      'This will permanently delete the team and its members. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);

              // Delete ONLY if current user is owner (safety)
              const { data: deleted, error: delErr } = await supabase
                .from('teams')
                .delete()
                .eq('id', teamIdParam)
                .eq('owner_id', userId)
                .select('id')
                .maybeSingle();

              if (delErr) throw delErr;

              if (!deleted?.id) {
                Alert.alert('Not allowed', 'Only the team owner can delete this team.');
                return;
              }

              // Clear *this user's* primary team if it was this team
              await supabase.from('Profiles').update({ primary_team_id: null }).eq('id', userId).eq('primary_team_id', teamIdParam);

              Alert.alert('Deleted', 'Team deleted.');
              router.replace('/teams');
            } catch (e: any) {
              console.log('[CreateTeam] delete error:', e);
              Alert.alert('Could not delete', e?.message ?? 'Please try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const screenTitle = isEditMode ? 'Team Settings' : 'Create Team';
  const screenSubtitle = isEditMode ? 'Edit your team details' : 'Set up your team to start scrimming';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color="#e5e7eb" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{screenTitle}</Text>
            <Text style={styles.subtitle}>{screenSubtitle}</Text>
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

            {!isEditMode ? (
              <Pressable
                disabled={!canSubmit || saving}
                onPress={onCreate}
                style={[styles.primaryBtn, (!canSubmit || saving) && { opacity: 0.6 }]}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create Team</Text>}
              </Pressable>
            ) : (
              <>
                <Pressable
                  disabled={!canSubmit || saving}
                  onPress={onSaveChanges}
                  style={[styles.primaryBtn, (!canSubmit || saving) && { opacity: 0.6 }]}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Changes</Text>}
                </Pressable>

                {/* Delete Team (Owner only) */}
                {isOwner ? (
                  <Pressable disabled={saving} onPress={onDeleteTeam} style={[styles.dangerBtn, saving && { opacity: 0.7 }]}>
                    <Text style={styles.dangerBtnText}>Delete Team</Text>
                  </Pressable>
                ) : null}
              </>
            )}
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

  dangerBtn: {
    marginTop: 10,
    backgroundColor: 'rgba(248,113,113,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.45)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerBtnText: { color: '#fca5a5', fontWeight: '900' },

  footer: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 18 },
});
