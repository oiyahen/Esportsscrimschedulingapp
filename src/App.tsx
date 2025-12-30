import { useState, useEffect } from 'react';
import { Calendar, Target, Users, User } from 'lucide-react';
import { TopNav } from './components/TopNav';
import { DesktopSidebar } from './components/DesktopSidebar';
import { MobileTabBar } from './components/MobileTabBar';
import { DemoControls } from './components/DemoControls';
import { HomePage } from './components/screens/HomePage';
import { ScrimCenter } from './components/screens/ScrimCenter';
import { CreateScrimSlot } from './components/screens/CreateScrimSlot';
import { ScrimDetails } from './components/screens/ScrimDetails';
import { MyTeam } from './components/screens/MyTeam';
import { Profile } from './components/screens/Profile';
import { RegionSelection } from './components/screens/RegionSelection';
import { supabase } from './lib/supabaseclient';
import type { Session } from '@supabase/supabase-js';
import { AuthScreen } from './components/screens/AuthScreen';

type Screen = 'home' | 'scrim-center' | 'create-scrim' | 'scrim-details' | 'my-team' | 'profile';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  const [selectedScrimId, setSelectedScrimId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [debugProfile, setDebugProfile] = useState<any | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [scrims, setScrims] = useState<any[]>([]);
  const [profileScreen, setProfileScreen] = useState<'main' | 'region'>('main');

  const navigate = (screen: Screen) => {
    setCurrentScreen(screen);
    if (screen !== 'profile') setProfileScreen('main');
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('[Auth] Error fetching session:', error);
      if (!isMounted) return;

      setSession(data.session ?? null);
      setAuthLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[Auth] Auth state changed:', event);
      setSession(newSession);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function loadOrCreateProfile() {
      if (!session?.user?.id) {
        setDebugProfile(null);
        setShowOnboarding(false);
        setScrims([]);
        return;
      }

      const userId = session.user.id;

      const { data: existing, error: fetchErr } = await supabase
        .from('Profiles')
        .select('id, username, handle, email, primary_region, primary_team, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (fetchErr) {
        console.error('[Profile] Error fetching profile:', fetchErr);
        return;
      }

      if (existing) {
        setDebugProfile(existing);
        if (!existing.primary_region) setShowOnboarding(true);
        return;
      }

      const insertPayload = {
        id: userId,
        email: session.user.email ?? null,
        username: session.user.email?.split('@')[0] ?? 'New User',
        handle: null,
        primary_region: null,
        primary_team: null,
      };

      const { data: created, error: insertErr } = await supabase
        .from('Profiles')
        .insert(insertPayload)
        .select('id, username, handle, email, primary_region, primary_team, created_at')
        .single();

      if (insertErr) {
        console.error('[Profile] Error creating profile:', insertErr);
        return;
      }

      setDebugProfile(created);
      setShowOnboarding(true);
    }

    loadOrCreateProfile();
  }, [session]);

  useEffect(() => {
    async function loadScrims() {
      if (!session?.user?.id) return;

      const { data: scrimsData, error } = await supabase
        .from('scrims')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('[Supabase] Error loading scrims:', error);
        return;
      }

      setScrims(scrimsData || []);
    }

    loadScrims();
  }, [session]);

  useEffect(() => {
    if (window.location.hash.includes('error=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const updateProfileRegion = async (newRegion: string) => {
    if (!debugProfile?.id) return;

    const { error } = await supabase.from('Profiles').update({ primary_region: newRegion }).eq('id', debugProfile.id);

    if (error) {
      console.error('[Profile] Error updating region:', error);
      return;
    }

    setDebugProfile({
      ...debugProfile,
      primary_region: newRegion,
    });
  };

  const updateProfileDetails = async (updates: {
    username?: string;
    handle?: string;
    email?: string;
    primary_team?: string;
  }) => {
    if (!debugProfile?.id) return;

    const { data, error } = await supabase
      .from('Profiles')
      .update(updates)
      .eq('id', debugProfile.id)
      .select('id, username, handle, email, primary_region, primary_team, created_at')
      .single();

    if (error) {
      console.error('[Profile] Error updating details:', error);
      return;
    }

    setDebugProfile((prev: any) => ({
      ...prev,
      ...data,
    }));
  };

  const handleViewScrimDetails = (scrimId: string) => {
    setSelectedScrimId(scrimId);
    setCurrentScreen('scrim-details');
  };

  const handleCreateScrim = () => {
    setCurrentScreen('create-scrim');
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('[Auth] Sign out error:', error);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center">
        <div className="text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  // Onboarding-only Region Selection (NOT a tab / NOT a top-level screen)
  if (showOnboarding) {
    return (
      <RegionSelection
        currentRegion={debugProfile?.primary_region}
        onRegionSelected={(newRegion) => updateProfileRegion(newRegion)}
        onComplete={() => {
          setShowOnboarding(false);
          setCurrentScreen('home');
        }}
        onBack={() => {
          setShowOnboarding(false);
          setCurrentScreen('profile');
        }}
      />
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomePage onViewScrimDetails={handleViewScrimDetails} onCreateScrim={handleCreateScrim} />;

      case 'scrim-center':
        return <ScrimCenter onViewScrimDetails={handleViewScrimDetails} onCreateScrim={handleCreateScrim} />;

      case 'create-scrim':
        return <CreateScrimSlot onClose={() => setCurrentScreen('scrim-center')} />;

      case 'scrim-details':
        return <ScrimDetails scrimId={selectedScrimId} onBack={() => setCurrentScreen('home')} />;

      case 'my-team':
        return <MyTeam profile={debugProfile} scrims={scrims} />;

      case 'profile':
        return profileScreen === 'region' ? (
          <RegionSelection
            currentRegion={debugProfile?.primary_region}
            onRegionSelected={(newRegion) => updateProfileRegion(newRegion)}
            onComplete={() => setProfileScreen('main')}
            onBack={() => setProfileScreen('main')}
          />
        ) : (
          <Profile
            onNavigateToRegionSelection={() => setProfileScreen('region')}
            profile={debugProfile}
            scrims={scrims}
            onUpdateProfile={updateProfileDetails}
          />
        );

      default:
        return <HomePage onViewScrimDetails={handleViewScrimDetails} onCreateScrim={handleCreateScrim} />;
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Calendar },
    { id: 'scrim-center', label: 'Scrim Center', icon: Target },
    { id: 'my-team', label: 'My Team', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      <TopNav onCreateScrim={handleCreateScrim} profile={debugProfile} isAuthed={!!session} onSignOut={handleSignOut} />

      <div className="flex">
        <DesktopSidebar navItems={navItems} currentScreen={currentScreen} onNavigate={(screen) => navigate(screen as Screen)} />

        <main className="flex-1 pb-20 lg:pb-0">{renderScreen()}</main>
      </div>

      <MobileTabBar navItems={navItems} currentScreen={currentScreen} onNavigate={(screen) => navigate(screen as Screen)} />

      <DemoControls onShowOnboarding={() => setShowOnboarding(true)} />
    </div>
  );
}
