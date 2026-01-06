import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

type TeamRow = {
  id: string;
  owner_id: string;
  name: string;
  tag: string | null;
};

type ProfileRow = {
  id: string;
  primary_team_id: string | null;
};

type CandidateProfile = {
  id: string;
  username: string | null;
  handle: string | null;
};

function normalizeInput(raw: string) {
  return raw.trim().replace(/^@/, '');
}

function displayNameFromProfile(p: CandidateProfile) {
  const handle = p.handle?.trim() ? (p.handle.startsWith('@') ? p.handle : `@${p.handle}`) : null;
  const username = p.username?.trim() ? p.username.trim() : null;
  return username || handle || 'Player';
}

function initialsFromText(text: string) {
  const clean = text.replace('@', '').replace(/\(.*?\)/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function InviteMemberScreen() {
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [team, setTeam] = useState<TeamRow | null>(null);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const teamLabel = useMemo(() => {
    if (!team) return 'No primary team set';
    const tag = team.tag?.trim() ? team.tag.trim() : null;
    return tag ? `[${tag}] ${team.name}` : team.name;
  }, [team]);

  const teamPill = useMemo(() => {
    if (!team) return 'SET TEAM';
    const tag = team.tag?.trim() ? team.tag.trim() : team.name.slice(0, 2).toUpperCase();
    return tag.toUpperCase();
  }, [team]);

  const loadContext = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      setCandidate(null);

      const { data: sessionData, error: sErr } = await supabase.auth.getSession();
      if (sErr) throw sErr;

      const user = sessionData.session?.user;
      if (!user) {
        setTeam(null);
        setIsOwner(false);
        setLoading(false);
        return;
      }

      const { data: p, error: pErr } = await supabase
        .from('Profiles')
        .select('id, primary_team_id')
        .eq('id', user.id)
        .maybeSingle();

      if (pErr) throw pErr;

      const profile = (p ?? null) as ProfileRow | null;
      const teamId = profile?.primary_team_id ?? null;

      if (!teamId) {
        setTeam(null);
        setIsOwner(false);
        setLoading(false);
        return;
      }

      const { data: t, error: tErr } = await supabase
        .from('teams')
        .select('id, owner_id, name, tag')
        .eq('id', teamId)
        .maybeSingle();

      if (tErr) throw tErr;

      const tr = (t ?? null) as TeamRow | null;
      setTeam(tr);
      setIsOwner(!!tr?.owner_id && tr.owner_id === user.id);

      setLoading(false);
    } catch (e: any) {
      console.log('[InviteMember] load error:', e);
      setErrorMsg(e?.message ?? 'Failed to load team context.');
      setTeam(null);
      setIsOwner(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const findCandidate = useCallback(async () => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setCandidate(null);

      const input = normalizeInput(query);
      if (!input) {
        setErrorMsg('Enter a username or handle.');
        return null;
      }

      setSearching(true);

      const h = input;
      const hAt = `@${input}`;

      const { data: candidates, error: cErr } = await supabase
        .from('Profiles')
        .select('id, username, handle')
        .or(`handle.eq.${h},handle.eq.${hAt},username.eq.${h}`)
        .limit(5);

      if (cErr) throw cErr;

      const matches = (candidates ?? []).filter((r: any) => !!r?.id) as CandidateProfile[];

      if (matches.length === 0) {
        setErrorMsg(`No user found for "${query.trim()}".`);
        setSearching(false);
        return null;
      }

      if (matches.length > 1) {
        setErrorMsg('Multiple users matched. Use an exact handle or username.');
        setSearching(false);
        return null;
      }

      setCandidate(matches[0]);
      setSearching(false);
      return matches[0];
    } catch (e: any) {
      console.log('[InviteMember] search error:', e);
      setErrorMsg(e?.message ?? 'Search failed.');
      setSearching(false);
      return null;
    }
  }, [query]);

  const invite = useCallback(async () => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);

      const input = normalizeInput(query);
      if (!input) {
        setErrorMsg('Enter a username or handle.');
        return;
      }

      setSubmitting(true);

      const { data: sessionData, error: sErr } = await supabase.auth.getSession();
      if (sErr) throw sErr;

      const user = sessionData.session?.user;
      if (!user) throw new Error('Not signed in.');
      if (!team?.id) throw new Error('No primary team set.');
      if (!isOwner) throw new Error('Only the team owner can send invites right now.');

      // Use preview candidate if available; otherwise search once
      let target = candidate;
      if (!target || normalizeInput(displayNameFromProfile(target)) === '') {
        target = await findCandidate();
      }
      if (!target) {
        setSubmitting(false);
        return;
      }

      if (target.id === user.id) {
        setErrorMsg('You cannot invite yourself.');
        setSubmitting(false);
        return;
      }

      // Check pending invite already exists
      const { data: existing, error: exErr } = await supabase
        .from('team_invites')
        .select('id, status')
        .eq('team_id', team.id)
        .eq('invited_user_id', target.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (exErr) throw exErr;

      if (existing?.id) {
        setErrorMsg('This player already has a pending invite.');
        setSubmitting(false);
        return;
      }

      // Create invite
      const { error: insErr } = await supabase.from('team_invites').insert({
        team_id: team.id,
        invited_user_id: target.id,
        invited_by: user.id,
        status: 'pending',
      });

      if (insErr) throw insErr;

      const display = displayNameFromProfile(target);
      setSuccessMsg(`Invite sent to ${display}.`);

      // keep candidate card but clear input for quick re-invites
      setQuery('');
      setCandidate(null);
      setSubmitting(false);
    } catch (e: any) {
      console.log('[InviteMember] invite error:', e);
      setErrorMsg(e?.message ?? 'Could not send invite.');
      setSubmitting(false);
    }
  }, [query, team, isOwner, candidate, findCandidate]);

  const disabledReason = useMemo(() => {
    if (!team) return 'Set a primary team first (Profile → Teams).';
    if (!isOwner) return 'Only the team owner can invite players (for now).';
    return null;
  }, [team, isOwner]);

  const canInteract = !!team && isOwner && !submitting;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
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

        <Text style={styles.headerTitle}>Invite Member</Text>

        <View style={{ width: 36, height: 36 }} />
      </View>

      <View style={styles.container}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading…</Text>
          </View>
        ) : (
          <>
            {/* Hero / Team */}
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.teamPill}>
                  <Text style={styles.teamPillText}>{teamPill}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle}>Add a player to your roster</Text>
                  <Text style={styles.heroSubtitle}>
                    Send an invite by handle or username. They can accept from Teams.
                  </Text>
                </View>
              </View>

              <View style={styles.teamLine}>
                <Ionicons name="shield-checkmark" size={16} color="#60a5fa" />
                <Text style={styles.teamLineText}>{teamLabel}</Text>
              </View>

              {disabledReason ? <Text style={styles.notice}>{disabledReason}</Text> : null}
            </View>

            {/* Search / Input */}
            <View style={styles.card}>
              <Text style={styles.label}>Player handle</Text>

              <View style={styles.inputRow}>
                <View style={styles.inputIcon}>
                  <Ionicons name="at" size={18} color="#94a3b8" />
                </View>

                <TextInput
                  value={query}
                  onChangeText={(t) => setQuery(t)}
                  placeholder="playerhandle"
                  placeholderTextColor="#64748b"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  editable={canInteract}
                  returnKeyType="search"
                  onSubmitEditing={() => (canInteract ? findCandidate() : null)}
                />

                <Pressable
                  onPress={findCandidate}
                  disabled={!canInteract || searching}
                  style={({ pressed }) => [
                    styles.searchBtn,
                    (!canInteract || searching) && styles.searchBtnDisabled,
                    pressed && canInteract && !searching && { opacity: 0.9 },
                  ]}
                >
                  {searching ? (
                    <ActivityIndicator />
                  ) : (
                    <Ionicons name="search" size={18} color="#e5e7eb" />
                  )}
                </Pressable>
              </View>

              {/* Candidate Preview */}
              {candidate ? (
                <View style={styles.previewCard}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initialsFromText(displayNameFromProfile(candidate))}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewName}>{displayNameFromProfile(candidate)}</Text>
                    <Text style={styles.previewSub}>
                      {candidate.username ? `username: ${candidate.username}` : 'username: —'} ·{' '}
                      {candidate.handle ? `handle: ${candidate.handle}` : 'handle: —'}
                    </Text>
                  </View>

                  <View style={styles.previewPill}>
                    <Text style={styles.previewPillText}>READY</Text>
                  </View>
                </View>
              ) : null}

              {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
              {successMsg ? <Text style={styles.success}>{successMsg}</Text> : null}

              {/* Primary CTA */}
              <Pressable
                onPress={invite}
                disabled={!canInteract}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  !canInteract && styles.primaryBtnDisabled,
                  pressed && canInteract && { opacity: 0.92 },
                ]}
              >
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>{submitting ? 'Sending…' : 'Send Invite'}</Text>
              </Pressable>

              {/* Secondary actions (only after success) */}
              {successMsg ? (
                <View style={styles.secondaryRow}>
                  <Pressable
                    onPress={() => {
                      setSuccessMsg(null);
                      setErrorMsg(null);
                      setCandidate(null);
                      setQuery('');
                    }}
                    style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
                  >
                    <Ionicons name="add" size={18} color="#e5e7eb" />
                    <Text style={styles.secondaryBtnText}>Invite another</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => router.replace('/(tabs)/my_team')}
                    style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.9 }]}
                  >
                    <Ionicons name="people" size={18} color="#e5e7eb" />
                    <Text style={styles.secondaryBtnText}>Back to team</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>

            <Text style={styles.footer}>Pinnacle — Passion. Potential. Performance.</Text>
          </>
        )}
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
  headerTitle: { flex: 1, color: '#e5e7eb', fontSize: 16, fontWeight: '900' },

  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
  },
  iconButtonPressed: { opacity: 0.85 },

  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#94a3b8', marginTop: 10 },

  heroCard: {
    backgroundColor: '#0b1220',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#111827',
    marginBottom: 14,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  teamPill: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#050814',
    borderWidth: 1,
    borderColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamPillText: { color: '#60a5fa', fontWeight: '900', letterSpacing: 1 },

  heroTitle: { color: '#e5e7eb', fontSize: 16, fontWeight: '900' },
  heroSubtitle: { color: '#94a3b8', fontSize: 12, marginTop: 4, lineHeight: 16 },

  teamLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  teamLineText: { color: '#e5e7eb', fontSize: 13, fontWeight: '800' },

  notice: { color: '#64748b', fontSize: 12, marginTop: 10, lineHeight: 16 },

  card: {
    backgroundColor: '#0b1220',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#111827',
  },

  label: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  inputIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#050814',
    borderWidth: 1,
    borderColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#050814',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#e5e7eb',
    fontSize: 15,
    fontWeight: '700',
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: { opacity: 0.55 },

  previewCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#050814',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 16,
    padding: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#e5e7eb', fontWeight: '900' },
  previewName: { color: '#e5e7eb', fontSize: 14, fontWeight: '900' },
  previewSub: { color: '#94a3b8', fontSize: 12, marginTop: 3 },
  previewPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.30)',
  },
  previewPillText: { color: '#34d399', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },

  error: { color: '#fca5a5', marginTop: 10, fontSize: 12, fontWeight: '700' },
  success: { color: '#34d399', marginTop: 10, fontSize: 12, fontWeight: '800' },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  secondaryRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: { color: '#e5e7eb', fontWeight: '900', fontSize: 12 },

  footer: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 14 },
});
