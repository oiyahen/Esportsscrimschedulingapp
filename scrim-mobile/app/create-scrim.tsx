import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

type RegionId =
  | 'pacific-nw'
  | 'pacific-sw'
  | 'central-north'
  | 'central-south'
  | 'atlantic-north'
  | 'atlantic-south';

const REGION_OPTIONS: { id: RegionId; label: string }[] = [
  { id: 'pacific-nw', label: 'Pacific Northwest' },
  { id: 'pacific-sw', label: 'Pacific Southwest' },
  { id: 'central-north', label: 'Central North' },
  { id: 'central-south', label: 'Central South' },
  { id: 'atlantic-north', label: 'Atlantic North' },
  { id: 'atlantic-south', label: 'Atlantic South' },
];

type ScrimTypeId = 'hardpoints' | 'search' | 'third' | 'respawns' | 'custom';

const SCRIM_TYPES: { id: ScrimTypeId; label: string; minutes: number }[] = [
  { id: 'hardpoints', label: 'Hardpoints', minutes: 60 },
  { id: 'search', label: 'Search', minutes: 90 },
  { id: 'third', label: '3rd Mode', minutes: 60 },
  { id: 'respawns', label: 'Respawns', minutes: 90 },
  { id: 'custom', label: 'Custom', minutes: 90 },
];

function minutesLabel(min: number) {
  const hrs = min / 60;
  if (Number.isInteger(hrs)) return `${hrs} hour${hrs === 1 ? '' : 's'}`;
  return `${hrs} hours`;
}

function addMinutesToISO(iso: string, minutes: number) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

function scrimTypeToDb(scrimType: ScrimTypeId) {
  if (scrimType === 'hardpoints') return 'hp-only';
  if (scrimType === 'search') return 'snd-only';
  if (scrimType === 'third') return 'third-only';
  if (scrimType === 'respawns') return 'all-respawns';
  return 'mixed'; // custom
}

function scrimTypeToModes(scrimType: ScrimTypeId): string[] {
  if (scrimType === 'hardpoints') return ['hp'];
  if (scrimType === 'search') return ['snd'];
  if (scrimType === 'third') return ['control'];
  if (scrimType === 'respawns') return ['hp', 'control'];
  return ['custom'];
}

type TeamSearchRow = { id: string; name: string; tag: string | null };

export default function CreateScrimScreen() {
  const [booting, setBooting] = useState(true);
  const [posting, setPosting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [primaryTeamId, setPrimaryTeamId] = useState<string | null>(null);
  const [region, setRegion] = useState<RegionId | null>(null);

  // Modal date-time picker state
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [dateModalOpen, setDateModalOpen] = useState(false);

  const [scrimType, setScrimType] = useState<ScrimTypeId>('hardpoints');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  const [tier, setTier] = useState<string>('Any');
  const [notes, setNotes] = useState<string>('');

  // Invite opponent
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResults, setInviteResults] = useState<TeamSearchRow[]>([]);
  const [invitedTeam, setInvitedTeam] = useState<TeamSearchRow | null>(null);

  const timeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const found = SCRIM_TYPES.find((s) => s.id === scrimType);
    setDurationMinutes(found?.minutes ?? 90);
  }, [scrimType]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setBooting(true);
        setErrorMsg(null);

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const user = sessionData.session?.user;
        if (!user) {
          if (mounted) {
            setPrimaryTeamId(null);
            setRegion(null);
            setBooting(false);
          }
          return;
        }

        const { data: p, error: pErr } = await supabase
          .from('Profiles')
          .select('primary_team_id, primary_region')
          .eq('id', user.id)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!mounted) return;

        setPrimaryTeamId(p?.primary_team_id ?? null);
        setRegion((p?.primary_region ?? null) as RegionId | null);

        const now = new Date();
        now.setMinutes(now.getMinutes() + 15);
        setStartDate(now);

        setBooting(false);
      } catch (e: any) {
        console.log('[CreateScrim] init error:', e);
        if (mounted) {
          setErrorMsg(e?.message ?? 'Failed to load profile/team.');
          setBooting(false);
        }
      }
    };

    init();
    return () => {
      mounted = false;
    };
  }, []);

  const durationText = useMemo(() => minutesLabel(durationMinutes), [durationMinutes]);

  const displayDate = useMemo(() => {
    return startDate.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [startDate]);

  const searchTeams = async (q: string) => {
    const query = q.trim();
    if (!query) {
      setInviteResults([]);
      return;
    }

    try {
      setInviteLoading(true);

      const { data, error } = await supabase
        .from('teams')
        .select('id, name, tag')
        .ilike('name', `%${query}%`)
        .order('name', { ascending: true })
        .limit(8);

      if (error) throw error;
      setInviteResults((data ?? []) as any);
    } catch (e: any) {
      console.log('[CreateScrim] team search error:', e);
      setInviteResults([]);
    } finally {
      setInviteLoading(false);
    }
  };

  const submit = async () => {
    try {
      Keyboard.dismiss();
      setPosting(true);
      setErrorMsg(null);

      if (!primaryTeamId) {
        setErrorMsg('No primary team set. Create/select a team first.');
        return;
      }
      if (!region) {
        setErrorMsg('Pick a region.');
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        setErrorMsg('Not signed in.');
        return;
      }

      const startISO = startDate.toISOString();
      const endISO = addMinutesToISO(startISO, durationMinutes);

      const payload = {
        host_team_id: primaryTeamId,
        opponent_team_id: invitedTeam?.id ?? null,
        status: 'open',
        region,
        tier: tier === 'Any' ? null : tier,
        modes: scrimTypeToModes(scrimType),
        start_time: startISO,
        end_time: endISO,
        time_zone: timeZone,
        duration_minutes: durationMinutes,
        notes: notes?.trim() ? notes.trim() : null,
        created_by: user.id,
        scrim_type: scrimTypeToDb(scrimType),
      };

      const { error } = await supabase.from('scrims').insert(payload);
      if (error) throw error;

      router.back();
    } catch (e: any) {
      console.log('[CreateScrim] submit error:', e);
      setErrorMsg(e?.message ?? 'Failed to post scrim slot.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Top bar */}
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={20} color="#e5e7eb" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Post Scrim</Text>
            <Text style={styles.subtitle}>Fast, clean, and ready to match</Text>
          </View>

          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="close" size={20} color="#e5e7eb" />
          </Pressable>
        </View>

        {booting ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.mutedText}>Loading…</Text>
          </View>
        ) : !primaryTeamId ? (
          <View style={styles.card}>
            <Text style={styles.blockTitle}>You need a team to post scrims</Text>
            <Text style={styles.blockText}>
              Create a team (or set a primary team) first. Then you’ll be able to post and accept scrims.
            </Text>

            <View style={styles.actionsRow}>
              <Pressable onPress={() => router.push('/teams')} style={styles.btnPrimary}>
                <Text style={styles.btnPrimaryText}>Go to Teams</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/create-team')} style={styles.btnGhost}>
                <Text style={styles.btnGhostText}>Create Team</Text>
              </Pressable>
            </View>

            {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
          </View>
        ) : (
          <View style={styles.card}>
            {/* Date + Time */}
            <View style={styles.field}>
              <Text style={styles.label}>Date & Time</Text>

              <Pressable onPress={() => setDateModalOpen(true)} style={styles.selectBtn}>
                <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
                <Text style={styles.selectBtnText}>{displayDate}</Text>
                <Ionicons name="chevron-down" size={16} color="#64748b" />
              </Pressable>

              <DateTimePickerModal
                isVisible={dateModalOpen}
                mode="datetime"
                date={startDate}
                onConfirm={(d) => {
                  setDateModalOpen(false);
                  setStartDate(d);
                }}
                onCancel={() => setDateModalOpen(false)}
              />
            </View>

            {/* Region */}
            <View style={styles.field}>
              <Text style={styles.label}>Region</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={region ?? undefined}
                  onValueChange={(val) => setRegion(val as RegionId)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                  dropdownIconColor="#9ca3af"
                >
                  <Picker.Item label="Select region…" value={undefined as any} />
                  {REGION_OPTIONS.map((r) => (
                    <Picker.Item key={r.id} label={r.label} value={r.id} />
                  ))}
                </Picker>
              </View>
              <Text style={styles.helperText}>Defaults to your profile region.</Text>
            </View>

            {/* Tier */}
            <View style={styles.field}>
              <Text style={styles.label}>Preferred Tier</Text>
              <View style={styles.pillRow}>
                {['Any', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5'].map((t) => {
                  const selected = tier === t;
                  return (
                    <Pressable key={t} onPress={() => setTier(t)} style={[styles.pill, selected && styles.pillSelected]}>
                      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Scrim Type */}
            <View style={styles.field}>
              <Text style={styles.label}>Scrim Type</Text>
              <View style={styles.pillRow}>
                {SCRIM_TYPES.map((s) => {
                  const selected = scrimType === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setScrimType(s.id)}
                      style={[styles.pill, selected && styles.pillSelected]}
                    >
                      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{s.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.helperText}>Duration auto-set to {durationText} for this scrim type.</Text>
            </View>

            {/* Invite opponent */}
            <View style={styles.field}>
              <Text style={styles.label}>Invite opponent</Text>

              {invitedTeam ? (
                <View style={styles.invitedPill}>
                  <Text style={styles.invitedText}>
                    {invitedTeam.name} {invitedTeam.tag ? `(${invitedTeam.tag})` : ''}
                  </Text>
                  <Pressable onPress={() => setInvitedTeam(null)} hitSlop={10}>
                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.searchRow}>
                    <TextInput
                      value={inviteQuery}
                      onChangeText={(v) => {
                        setInviteQuery(v);
                        searchTeams(v);
                      }}
                      placeholder="Search team name…"
                      placeholderTextColor="#6b7280"
                      style={[styles.input, { flex: 1 }]}
                    />
                    {inviteLoading ? <ActivityIndicator /> : null}
                  </View>

                  {inviteResults.length > 0 ? (
                    <View style={styles.resultsBox}>
                      {inviteResults.map((t) => (
                        <Pressable
                          key={t.id}
                          onPress={() => {
                            setInvitedTeam(t);
                            setInviteQuery('');
                            setInviteResults([]);
                          }}
                          style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.9 }]}
                        >
                          <Text style={styles.resultName}>
                            {t.name} {t.tag ? `(${t.tag})` : ''}
                          </Text>
                          <Ionicons name="add" size={16} color="#60a5fa" />
                        </Pressable>
                      ))}
                    </View>
                  ) : null}

                  <Text style={styles.helperText}>Optional — leave blank for open scrims.</Text>
                </>
              )}
            </View>

            {/* Notes */}
            <View style={styles.field}>
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Any requirements, Discord info, etc…"
                placeholderTextColor="#6b7280"
                style={[styles.input, styles.textarea]}
                multiline
              />
            </View>

            {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

            {/* Actions */}
            <View style={styles.actionsRow}>
              <Pressable disabled={posting} onPress={() => router.back()} style={[styles.btnGhost, posting && { opacity: 0.7 }]}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>

              <Pressable disabled={posting} onPress={submit} style={[styles.btnPrimary, posting && { opacity: 0.7 }]}>
                {posting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Post</Text>}
              </Pressable>
            </View>
          </View>
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
  title: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
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

  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28 },
  mutedText: { color: '#9ca3af', marginTop: 10 },

  card: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    gap: 14,
  },

  blockTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  blockText: { color: '#9ca3af', marginTop: 8, lineHeight: 18 },

  field: { gap: 8 },
  label: { color: '#e5e7eb', fontSize: 13, fontWeight: '800' },

  selectBtn: {
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectBtnText: { color: '#ffffff', fontWeight: '800', flex: 1 },

  input: {
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  textarea: { minHeight: 88, textAlignVertical: 'top' },

  helperText: { color: '#94a3b8', fontSize: 12 },

  pickerWrap: {
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: { color: '#ffffff', backgroundColor: '#0b1220' },
  pickerItem: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
  },
  pillSelected: { borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.15)' },
  pillText: { color: '#9ca3af', fontSize: 12, fontWeight: '800' },
  pillTextSelected: { color: '#60a5fa' },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultsBox: {
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultName: { color: '#e5e7eb', fontWeight: '700' },

  invitedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  invitedText: { color: '#e5e7eb', fontWeight: '800' },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },

  btnGhost: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
  },
  btnGhostText: { color: '#e5e7eb', fontWeight: '900' },

  btnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
  },
  btnPrimaryText: { color: '#ffffff', fontWeight: '900' },

  error: { color: '#fca5a5', fontSize: 12, marginTop: 10 },

  footer: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 18 },
});
