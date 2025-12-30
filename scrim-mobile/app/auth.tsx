import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';


export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();


  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const e = email.trim();
    const p = password.trim();
    if (!e || !p) return false;
    if (!e.includes('@')) return false;
    if (!isLogin && name.trim().length < 2) return false;
    return true;
  }, [email, password, name, isLogin]);

  const onSubmit = async () => {
    try {
      setBusy(true);
      setErrorMsg(null);
      setInfoMsg(null);

      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      if (!cleanEmail.includes('@')) {
        setErrorMsg('Enter a valid email.');
        return;
      }
      if (cleanPassword.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
      if (!isLogin && name.trim().length < 2) {
        setErrorMsg('Enter your name.');
        return;
      }

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });
      if (error) throw error;

      console.log('login session?', !!data.session);
      setInfoMsg('Logged in ✅');
      router.replace('/(tabs)');
      return;
    }


      // Sign Up
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: { full_name: name.trim() }, // stored in auth metadata
        },
      });
      if (error) throw error;
      if (data.session) {
        router.replace('/(tabs)');
}

      // If email confirmations are ON, user may need to confirm email
      // We'll show a message either way.
      if (!data.session) {
        setInfoMsg('Account created. Check your email to confirm, then log in.');
      } else {
        setInfoMsg('Account created. Logging you in…');
      }
    } catch (e: any) {
      console.log('Auth submit error:', e);
      setErrorMsg(e?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const onForgotPassword = async () => {
    try {
      setBusy(true);
      setErrorMsg(null);
      setInfoMsg(null);

      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail.includes('@')) {
        setErrorMsg('Enter your email first.');
        return;
      }

      // Simple reset: sends an email (you can wire a reset screen later)
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) throw error;

      setInfoMsg('Password reset email sent.');
      if (Platform.OS !== 'web') {
        Alert.alert('Password Reset', 'Password reset email sent.');
      }
    } catch (e: any) {
      console.log('Forgot password error:', e);
      setErrorMsg(e?.message ?? 'Could not send reset email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Brand Header */}
        <View style={styles.brand}>
          <View style={styles.logo}>
            <View style={styles.logoInner} />
          </View>
          <Text style={styles.title}>Scrim Center</Text>
          <Text style={styles.subtitle}>The Scrim OS for Challengers</Text>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          {/* Toggle */}
          <View style={styles.toggleWrap}>
            <Pressable
              onPress={() => setIsLogin(true)}
              style={[styles.toggleBtn, isLogin ? styles.toggleActive : styles.toggleInactive]}
            >
              <Text style={[styles.toggleText, isLogin ? styles.toggleTextActive : styles.toggleTextInactive]}>
                Log In
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setIsLogin(false)}
              style={[styles.toggleBtn, !isLogin ? styles.toggleActive : styles.toggleInactive]}
            >
              <Text style={[styles.toggleText, !isLogin ? styles.toggleTextActive : styles.toggleTextInactive]}>
                Sign Up
              </Text>
            </Pressable>
          </View>

          {/* Name (signup only) */}
          {!isLogin && (
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color="#64748b" style={styles.leftIcon} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="John Doe"
                  placeholderTextColor="#475569"
                  style={styles.input}
                />
              </View>
            </View>
          )}

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.leftIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#475569"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.leftIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#475569"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.input, { paddingRight: 44 }]}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.rightIconBtn}
                hitSlop={8}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#94a3b8"
                />
              </Pressable>
            </View>
          </View>

          {/* Forgot password (login only) */}
          {isLogin && (
            <View style={styles.forgotRow}>
              <Pressable onPress={onForgotPassword} disabled={busy}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>
          )}

          {/* Errors / info */}
          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
          {infoMsg ? <Text style={styles.info}>{infoMsg}</Text> : null}

          {/* Submit */}
          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit || busy}
            style={({ pressed }) => [
              styles.primaryBtn,
              (!canSubmit || busy) && { opacity: 0.55 },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {busy ? 'Please wait…' : isLogin ? 'Log In' : 'Create Account'}
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social (stubs for now) */}
          <View style={styles.socialGrid}>
            <Pressable
              style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.9 }]}
              onPress={() => setInfoMsg('Google login coming soon.')}
            >
              <Ionicons name="logo-google" size={18} color="#e5e7eb" />
              <Text style={styles.socialText}>Google</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.socialBtn, pressed && { opacity: 0.9 }]}
              onPress={() => setInfoMsg('GitHub login coming soon.')}
            >
              <Ionicons name="logo-github" size={18} color="#e5e7eb" />
              <Text style={styles.socialText}>GitHub</Text>
            </Pressable>
          </View>

          {/* Terms (signup only) */}
          {!isLogin && (
            <Text style={styles.terms}>
              By signing up, you agree to our <Text style={styles.link}>Terms of Service</Text> and{' '}
              <Text style={styles.link}>Privacy Policy</Text>.
            </Text>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Pinnacle — Passion. Potential. Performance.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050814' },
  container: { flex: 1, padding: 16, justifyContent: 'center' },

  brand: { alignItems: 'center', marginBottom: 18 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
  },
  logoInner: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#e5e7eb',
  },
  title: { color: '#e5e7eb', fontSize: 30, fontWeight: '800' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginTop: 6 },

  card: {
    backgroundColor: '#0b1220',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#111827',
  },

  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#050814',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#111827',
    marginBottom: 14,
    gap: 6,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  toggleActive: { backgroundColor: '#2563eb' },
  toggleInactive: { backgroundColor: 'transparent' },
  toggleText: { fontSize: 13, fontWeight: '700' },
  toggleTextActive: { color: '#ffffff' },
  toggleTextInactive: { color: '#94a3b8' },

  field: { marginBottom: 12 },
  label: { color: '#94a3b8', fontSize: 12, marginBottom: 8 },
  inputWrap: {
    position: 'relative',
    backgroundColor: '#050814',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 14,
    paddingLeft: 38,
  },
  leftIcon: { position: 'absolute', left: 12, top: 14 },
  rightIconBtn: { position: 'absolute', right: 12, top: 12, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  input: { paddingVertical: 12, paddingHorizontal: 12, color: '#e5e7eb', fontSize: 14 },

  forgotRow: { alignItems: 'flex-end', marginTop: -2, marginBottom: 10 },
  forgotText: { color: '#94a3b8', fontSize: 12 },

  error: { color: '#fca5a5', marginBottom: 10, fontSize: 12 },
  info: { color: '#86efac', marginBottom: 10, fontSize: 12 },

  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#111827' },
  dividerText: { color: '#64748b', fontSize: 12 },

  socialGrid: { flexDirection: 'row', gap: 10 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050814',
    borderWidth: 1,
    borderColor: '#111827',
    borderRadius: 14,
    paddingVertical: 12,
  },
  socialText: { color: '#e5e7eb', fontSize: 13, fontWeight: '700' },

  terms: { marginTop: 14, color: '#64748b', fontSize: 11, textAlign: 'center' },
  link: { color: '#60a5fa' },

  footer: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 14 },
});
