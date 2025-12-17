import { useState } from 'react';
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

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'scrim-center' | 'create-scrim' | 'scrim-details' | 'my-team' | 'profile' | 'region-selection'>('home');
  const [selectedScrimId, setSelectedScrimId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false); // Toggle this to true to show region selection

  const handleViewScrimDetails = (scrimId: string) => {
    setSelectedScrimId(scrimId);
    setCurrentScreen('scrim-details');
  };

  const handleCreateScrim = () => {
    setCurrentScreen('create-scrim');
  };

  // Show region selection onboarding if needed
  if (showOnboarding || currentScreen === 'region-selection') {
    return <RegionSelection 
      onComplete={() => {
        setShowOnboarding(false);
        setCurrentScreen('home');
      }} 
      onBack={() => setCurrentScreen('profile')}
    />;
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
        return <Profile onNavigateToRegionSelection={() => setCurrentScreen('region-selection')} />;
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
      <TopNav onCreateScrim={handleCreateScrim} />
      
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