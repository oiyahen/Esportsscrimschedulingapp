import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const [booting, setBooting] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setIsAuthed(!!data.session);
      setBooting(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (booting) return;

    // segments example:
    // - ["(tabs)"] for tab routes
    // - ["auth"] for auth routes
    // - ["region"] for app/region.tsx
    const top = segments[0];

    const inTabs = top === '(tabs)';
    const inAuth = top === 'auth';
    const inRegion = top === 'region';

    // Allowed routes when authed
    const isAllowedAuthedRoute =
  inTabs ||
  top === 'region' ||
  top === 'teams' ||
  top === 'create-team' ||
  top === 'create-scrim' ||
  top === 'scrim-details';


    // If not authed, force auth unless already in auth
    if (!isAuthed && !inAuth) {
      router.replace('/auth');
      return;
    }

    // If authed, force allowed authed routes (tabs + region)
    if (isAuthed && !isAllowedAuthedRoute) {
      router.replace('/(tabs)');
      return;
    }
  }, [booting, isAuthed, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      {/* Register region route so router.push('/region') works */}
      <Stack.Screen name="region" />
      <Stack.Screen name="scrim-details" />
    </Stack>
  );
}
