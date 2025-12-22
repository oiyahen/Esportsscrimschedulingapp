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

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<
    'home' | 'scrim-center' | 'create-scrim' | 'scrim-details' | 'my-team' | 'profile' | 'region-selection'
  >('home');
  const [selectedScrimId, setSelectedScrimId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false); // Toggle this to true to show region selection
  const [debugProfile, setDebugProfile] = useState<any | null>(null);  
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

  // Test Supabase connection once on app load
  useEffect(() => {
    async function testSupabaseConnection() {
      console.log('[Supabase] Testing connection to profiles…');

      const { data, error } = await supabase
        .from('Profiles')
        .select('id, username, handle, email, primary_region, primary_team, created_at')
        .limit(5);

      if (error) {
        console.error('[Supabase] Error talking to Supabase:', error);
      } else {
        console.log('[Supabase] Connection OK. Sample rows:', data);
        if (data && data.length > 0) {
          setDebugProfile(data[0]); // 👈 save first profile
        }
      }
    }

    testSupabaseConnection();
  }, []);

  const handleViewScrimDetails = (scrimId: string) => {
    setSelectedScrimId(scrimId);
    setCurrentScreen('scrim-details');
  };

  const handleCreateScrim = () => {
    setCurrentScreen('create-scrim');
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

  const navItems = [
    { id: 'home', label: 'Home', icon: Calendar },
    { id: 'scrim-center', label: 'Scrim Center', icon: Target },
    { id: 'my-team', label: 'My Team', icon: Users },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
          <TopNav onCreateScrim={handleCreateScrim} profile={debugProfile} />
      
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