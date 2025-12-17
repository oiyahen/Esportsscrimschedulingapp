import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { StatusChip } from '../ui/StatusChip';

interface HomePageProps {
  onViewScrimDetails: (scrimId: string) => void;
  onCreateScrim: () => void;
}

export function HomePage({ onViewScrimDetails, onCreateScrim }: HomePageProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');

  const scrims = [
    {
      id: '1',
      day: 'Monday',
      date: 'Dec 16',
      time: '8:00–10:00 PM',
      opponent: 'OpTic Red',
      mode: 'BO6 HP/SND',
      region: 'NA',
      tier: 'Tier 1',
      status: 'confirmed' as const,
    },
    {
      id: '2',
      day: 'Tuesday',
      date: 'Dec 17',
      time: '6:00–8:00 PM',
      opponent: 'FaZe Academy',
      mode: 'Full Series',
      region: 'NA',
      tier: 'Tier 2',
      status: 'confirmed' as const,
    },
    {
      id: '3',
      day: 'Wednesday',
      date: 'Dec 18',
      time: '9:00–11:00 PM',
      opponent: 'Team Envy',
      mode: 'BO6 HP Only',
      region: 'NA',
      tier: 'Tier 1',
      status: 'pending' as const,
    },
    {
      id: '4',
      day: 'Thursday',
      date: 'Dec 19',
      time: '7:00–9:00 PM',
      opponent: 'NYSL Challengers',
      mode: 'Search Only',
      region: 'NA',
      tier: 'Tier 2',
      status: 'confirmed' as const,
    },
    {
      id: '5',
      day: 'Friday',
      date: 'Dec 20',
      time: '8:00–10:00 PM',
      opponent: 'Atlanta Legion',
      mode: 'Full Series',
      region: 'NA',
      tier: 'Tier 1',
      status: 'pending' as const,
    },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl mb-1">Team Calendar</h1>
          <p className="text-gray-400">Your upcoming scrims at a glance</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'day'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'week'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-900/50 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg">This Week</h2>
            <p className="text-sm text-gray-400">Dec 16 – Dec 22, 2024</p>
          </div>
          <button className="p-2 hover:bg-gray-900/50 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <Button onClick={onCreateScrim} className="hidden lg:flex">
          <Plus className="w-4 h-4" />
          Post Scrim Slot
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {scrims.map((scrim) => (
          <div key={scrim.id} className="space-y-2">
            <div className="text-sm text-gray-400">
              <div>{scrim.day}</div>
              <div className="text-xs">{scrim.date}</div>
            </div>
            
            <Card onClick={() => onViewScrimDetails(scrim.id)} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm text-blue-400">{scrim.time}</div>
                <StatusChip status={scrim.status} />
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">vs</div>
                <div>{scrim.opponent}</div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Tag variant="info">{scrim.mode}</Tag>
                <Tag>{scrim.region}</Tag>
                <Tag variant="purple">{scrim.tier}</Tag>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Mobile FAB */}
      <button 
        onClick={onCreateScrim}
        className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-2xl shadow-blue-500/40 flex items-center justify-center hover:scale-110 transition-transform z-40"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
