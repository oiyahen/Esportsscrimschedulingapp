import { useState, useEffect } from 'react';
import { Calendar, Target, Users, User, Plus } from 'lucide-react';
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


export default function App() {
// 1) Your existing state
const [currentScreen, setCurrentScreen] = useState<
  'home' | 'scrim-center' | 'create-scrim' | 'scrim-details' | 'my-team' | 'profile' | 'region-selection'
>('home');
const [selectedScrimId, setSelectedScrimId] = useState<string | null>(null);
const [showOnboarding, setShowOnboarding] = useState(false); // Toggle this to true to show region selection
const [debugProfile, setDebugProfile] = useState<any | null>(null);
const [session, setSession] = useState<Session | null>(null);
const [authLoading, setAuthLoading] = useState(true);

  // AUTH: init + subscribe (single source of truth)
useEffect(() => {
  let isMounted = true;

  const init = async () => {
    console.log('[Auth] Checking current session…');
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
        console.warn('[Profile] No session - clearing debugProfile');
        setDebugProfile(null);
        setShowOnboarding(false);
        return;
      }

      const userId = session.user.id;
      console.log('[Profile] Loading profile for userId:', userId);

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
  if (window.location.hash.includes('error=')) {
    console.warn('[Auth] Hash contains auth error:', window.location.hash);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}, []);


const updateProfileRegion = async (newRegion: string) => {
  if (!debugProfile?.id) {
    console.warn('[Profile] No profile loaded yet, cannot update region.');
    return;
  }

  console.log('[Profile] Updating region to:', newRegion);

  const { error } = await supabase
    .from('Profiles')
    .update({ primary_region: newRegion })
    .eq('id', debugProfile.id);

  if (error) {
    console.error('[Profile] Error updating region:', error);
    return;
  }

  // Update local state so UI changes immediately
  setDebugProfile({
    ...debugProfile,
    primary_region: newRegion,
  });

  console.log('[Profile] Region updated in Supabase and local state.');
};

const updateProfileDetails = async (updates: {
  username?: string;
  handle?: string;
  email?: string;
  primary_team?: string;
}) => {
  if (!debugProfile?.id) {
    console.warn('[Profile] No profile loaded yet, cannot update details.');
    return;
  }

  console.log('[Profile] Updating details:', updates);

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

  console.log('[Profile] Details updated in Supabase and local state.', data);
};


  const handleViewScrimDetails = (scrimId: string) => {
    setSelectedScrimId(scrimId);
    setCurrentScreen('scrim-details');
  };

  const handleCreateScrim = () => {
    setCurrentScreen('create-scrim');
  };
  const handleSignOut = async () => {
  console.log('[Auth] Signing out…');
  const { error } = await supabase.auth.signOut();
  if (error) console.error('[Auth] Sign out error:', error);
  else console.log('[Auth] Signed out.');
};

// Show region selection onboarding if needed
if (showOnboarding || currentScreen === 'region-selection') {
    return (
      <RegionSelection
        currentRegion={debugProfile?.primary_region}
        onRegionSelected={(newRegion) => updateProfileRegion(newRegion)}
        onComplete={() => {
          setShowOnboarding(false);
          setCurrentScreen('home');
        }}
        onBack={() => setCurrentScreen('profile')}
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
        return <MyTeam />;
    case 'profile':
      return (
        <Profile
          onNavigateToRegionSelection={() => setCurrentScreen('region-selection')}
          profile={debugProfile}
          onUpdateProfile={updateProfileDetails}
        />
      );

      case 'region-selection':
        return <RegionSelection onComplete={() => setCurrentScreen('home')} onBack={() => setCurrentScreen('profile')} />;
      default:
        return <HomePage onViewScrimDetails={handleViewScrimDetails} onCreateScrim={handleCreateScrim} />;
    }
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

  const navItems = [
    { id: 'home', label: 'Home', icon: Calendar },
    { id: 'scrim-center', label: 'Scrim Center', icon: Target },
    { id: 'my-team', label: 'My Team', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    
    <div className="min-h-screen bg-[#0a0a0b] text-white">
<TopNav
  onCreateScrim={handleCreateScrim}
  profile={debugProfile}
  isAuthed={!!session}        
  onSignOut={handleSignOut}
/>


      
      <div className="flex">
        {/* Desktop Sidebar */}
        <DesktopSidebar 
          navItems={navItems} 
          currentScreen={currentScreen} 
          onNavigate={(screen) => setCurrentScreen(screen as any)} 
        />
        
        {/* Main Content */}
        <main className="flex-1 pb-20 lg:pb-0">
          {renderScreen()}
        </main>
      </div>

      {/* Mobile Tab Bar */}
      <MobileTabBar 
        navItems={navItems} 
        currentScreen={currentScreen} 
        onNavigate={(screen) => setCurrentScreen(screen as any)} 
      />

      {/* Demo Controls */}
      <DemoControls onShowOnboarding={() => setShowOnboarding(true)} />
    </div>
  );
}