import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';


type ProfileRow = {
  id: string;
  username: string | null;
  handle: string | null;
  email: string | null;
};

export default function EditProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [handle, setHandle] = useState<string>('');

  const canSave = useMemo(() => {
    const u = username.trim();
    const h = handle.trim().replace(/^@/, '');
    return u.length > 0 && h.length > 0 && !saving && !loading;
  }, [username, handle, saving, loading]);

  const load = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        router.replace('/');
        return;
      }

      const authEmail = user.email ?? '';

      const { data: profile, error: pErr } = await supabase
        .from('Profiles')
        .select('id, username, handle, email')
        .eq('id', user.id)
        .maybeSingle();

      if (pErr) throw pErr;

      setEmail((profile?.email ?? authEmail) || '');
      setUsername(profile?.username ?? '');
      setHandle(profile?.handle ?? '');
      setLoading(false);
    } catch (e: any) {
      console.log('Edit profile load error:', e);
      setErrorMsg('Could not load profile. Try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        router.replace('/');
        return;
      }

      const cleanedUsername = username.trim();
      const cleanedHandle = handle.trim().replace(/^@/, '');

      if (!cleanedUsername || !cleanedHandle) {
        setErrorMsg('Username and handle are required.');
        setSaving(false);
        return;
      }

      const { data: existing, error: exErr } = await supabase
        .from('Profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (exErr) throw exErr;

      if (existing?.id) {
        const { error: upErr } = await supabase
          .from('Profiles')
          .update({
            username: cleanedUsername,
            handle: cleanedHandle,
          })
          .eq('id', user.id);

        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await supabase.from('Profiles').insert({
          id: user.id,
          email: user.email ?? email ?? null,
          username: cleanedUsername,
          handle: cleanedHandle,
        });

        if (insErr) throw insErr;
      }

      router.back();
    } catch (e: any) {
      console.log('Edit profile save error:', e);
      setErrorMsg(e?.message ?? 'Could not save changes. Try again.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

          <Text style={styles.title}>Edit Profile</Text>

          <Pressable
            onPress={onSave}
            disabled={!canSave}
            style={({ pressed }) => [
              styles.saveButton,
              !canSave && styles.saveButtonDisabled,
              pressed && canSave && styles.saveButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Save profile"
          >
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.container}>
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#f87171" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder={loading ? 'Loading…' : 'Enter username'}
              placeholderTextColor="#475569"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              editable={!loading && !saving}
              returnKeyType="next"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Handle</Text>
            <View style={styles.handleWrap}>
              <Text style={styles.at}>@</Text>
              <TextInput
                value={handle.replace(/^@/, '')}
                onChangeText={(t) => setHandle(t.replace(/^@/, ''))}
                placeholder={loading ? 'Loading…' : 'yourhandle'}
                placeholderTextColor="#475569"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { flex: 1, paddingLeft: 0 }]}
                editable={!loading && !saving}
              />
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>Email</Text>
            <View style={styles.readonlyInput}>
              <Ionicons name="mail-outline" size={16} color="#64748b" />
              <Text style={styles.readonlyText}>{email || '—'}</Text>
            </View>

            <Text style={styles.helpText}>
              Email is read-only. Username + handle update your identity across scrims and teams.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
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

  saveButton: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  saveButtonPressed: { opacity: 0.85 },
  saveButtonDisabled: { opacity: 0.5 },

  saveText: { color: '#e5e7eb', fontSize: 13, fontWeight: '700' },
  saveTextDisabled: { color: '#94a3b8' },

  container: { flex: 1, padding: 16 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#3f1d1d',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  errorText: { color: '#fecaca', fontSize: 13, flex: 1 },

  card: {
    backgroundColor: '#0b1220',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#111827',
  },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 8 },

  input: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#050814',
    borderWidth: 1,
    borderColor: '#111827',
    color: '#e5e7eb',
    fontSize: 14,
  },

  handleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#050814',
    borderWidth: 1,
    borderColor: '#111827',
  },
  at: { color: '#94a3b8', fontSize: 14, fontWeight: '800' },

  readonlyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#050814',
    borderWidth: 1,
    borderColor: '#111827',
    opacity: 0.85,
  },
  readonlyText: { color: '#cbd5e1', fontSize: 14 },

  helpText: { color: '#64748b', fontSize: 12, marginTop: 12, lineHeight: 16 },
});
