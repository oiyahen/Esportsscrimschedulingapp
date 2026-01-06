import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [booting, setBooting] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  // 1) Boot: check session + ensure Profiles row exists (no duplicates)
  useEffect(() => {
    let mounted = true;

    const ensureProfileRow = async (user: { id: string; email?: string | null }) => {
      try {
        const { data: existing, error: fetchErr } = await supabase
          .from('Profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        // If query fails due to RLS/etc, don't crash app
        if (fetchErr) {
          console.log('[Layout] Profiles fetch error:', fetchErr);
          return;
        }

        // Only insert if it truly doesn't exist
        if (!existing?.id) {
          const insertPayload = {
            id: user.id, // IMPORTANT: keep auth user id (no new UUIDs)
            email: user.email ?? null,
            username: user.email?.split('@')[0] ?? 'New User',
            handle: null,
            primary_region: null,
            primary_team_id: null,
          };

          const { error: insErr } = await supabase.from('Profiles').insert(insertPayload);
          if (insErr) console.log('[Layout] Profiles insert error:', insErr);
        }
      } catch (e) {
        console.log('[Layout] ensureProfileRow error:', e);
      }
    };

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) console.log('[Layout] getSession error:', error);

        const session = data.session;
        setIsAuthed(!!session);

        // Auto-create Profiles row for any signed-in user
        if (session?.user?.id) {
          await ensureProfileRow({
            id: session.user.id,
            email: session.user.email ?? null,
          });
        }

        setBooting(false);
      } catch (e) {
        console.log('[Layout] init error:', e);
        if (mounted) setBooting(false);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setIsAuthed(!!session);

      // Ensure Profiles row on any auth change to a signed-in state
      if (session?.user?.id) {
        await ensureProfileRow({
          id: session.user.id,
          email: session.user.email ?? null,
        });
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // 2) Route guard
  useEffect(() => {
    if (booting) return;

    const top = segments[0]; // "(tabs)" or "auth" or other screen route
    const inTabs = top === '(tabs)';
    const inAuth = top === 'auth';

    // Screens that live OUTSIDE tabs but are allowed while authed
    const isAllowedAuthedRoute =
      inTabs ||
      top === 'region' ||
      top === 'teams' ||
      top === 'create-team' ||
      top === 'create-scrim' ||
      top === 'scrim-details' ||
      top === 'edit-profile' ||
      top === 'notifications' ||
      top === 'settings' ||
      top === 'invite-member';

    if (!isAuthed && !inAuth) {
      router.replace('/auth');
      return;
    }

    if (isAuthed && !isAllowedAuthedRoute) {
      router.replace('/(tabs)');
      return;
    }
  }, [booting, isAuthed, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />

      {/* Non-tab screens */}
      <Stack.Screen name="region" />
      <Stack.Screen name="teams" />
      <Stack.Screen name="create-team" />
      <Stack.Screen name="create-scrim" />
      <Stack.Screen name="scrim-details" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
