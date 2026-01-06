import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';

type RegionId =
  | 'pacific-nw'
  | 'pacific-sw'
  | 'central-north'
  | 'central-south'
  | 'atlantic-north'
  | 'atlantic-south';

const REGIONS: { id: RegionId; label: string }[] = [
  { id: 'pacific-nw', label: 'Pacific Northwest' },
  { id: 'pacific-sw', label: 'Pacific Southwest' },
  { id: 'central-north', label: 'Central North' },
  { id: 'central-south', label: 'Central South' },
  { id: 'atlantic-north', label: 'Atlantic North' },
  { id: 'atlantic-south', label: 'Atlantic South' },
];

export default function RegionScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const subtitle = useMemo(() => {
    const found = REGIONS.find((r) => r.id === currentRegion);
    return found ? `Current: ${found.label}` : 'Pick your primary region';
  }, [currentRegion]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const user = sessionData.session?.user;
        if (!user) {
          if (mounted) {
            setCurrentRegion(null);
            setLoading(false);
          }
          return;
        }

        const { data: p, error: pErr } = await supabase
          .from('Profiles')
          .select('primary_region')
          .eq('id', user.id)
          .maybeSingle();

        if (pErr) throw pErr;

        if (mounted) {
          setCurrentRegion(p?.primary_region ?? null);
          setLoading(false);
        }
      } catch (e: any) {
        console.log('Region load error:', e);
        if (mounted) {
          setErrorMsg(e?.message ?? 'Failed to load region.');
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const saveRegion = async (regionId: RegionId) => {
    try {
      setSaving(true);
      setErrorMsg(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        setErrorMsg('Not signed in.');
        return;
      }

      const { error } = await supabase
        .from('Profiles')
        .update({ primary_region: regionId })
        .eq('id', user.id);

      if (error) throw error;

      Keyboard.dismiss();
      router.back(); // go back to Profile
    } catch (e: any) {
      console.log('Region save error:', e);
      setErrorMsg(e?.message ?? 'Failed to save region.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#e5e7eb" />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Primary Region</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {saving ? <ActivityIndicator /> : <View style={{ width: 22 }} />}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {REGIONS.map((r) => {
              const selected = r.id === currentRegion;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => saveRegion(r.id)}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && { opacity: 0.9 },
                    selected && styles.rowSelected,
                    saving && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.rowText}>{r.label}</Text>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={18} color="#34d399" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050814' },
  container: { flex: 1, padding: 16 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: '#e5e7eb', fontSize: 16, fontWeight: '800' },
  subtitle: { color: '#94a3b8', fontSize: 12, marginTop: 2 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#94a3b8', marginTop: 10 },

  card: {
    backgroundColor: '#0b1220',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#111827',
    overflow: 'hidden',
  },
  row: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowSelected: {
    backgroundColor: '#0a1222',
  },
  rowText: { color: '#e5e7eb', fontSize: 13, fontWeight: '700' },

  error: { color: '#fca5a5', marginTop: 12, fontSize: 12 },
});
