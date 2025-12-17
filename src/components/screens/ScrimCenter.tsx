import { useState } from 'react';
import { Plus, Filter, Clock, MapPin, Trophy, Gamepad2, Star } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';

interface ScrimCenterProps {
  onViewScrimDetails: (scrimId: string) => void;
  onCreateScrim: () => void;
}

export function ScrimCenter({ onViewScrimDetails, onCreateScrim }: ScrimCenterProps) {
  const [timeFilter, setTimeFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  const availableScrims = [
    {
      id: '1',
      team: 'OpTic Red',
      logo: 'OR',
      time: '8:00–10:00 PM EST',
      date: 'Tonight',
      region: 'NA',
      tier: 'Tier 1',
      mode: 'BO6 HP/SND',
      reliability: 'High Reliability',
      logoColor: 'from-green-500 to-green-600',
    },
    {
      id: '2',
      team: 'FaZe Academy',
      logo: 'FA',
      time: '6:00–8:00 PM EST',
      date: 'Tomorrow',
      region: 'NA',
      tier: 'Tier 2',
      mode: 'Full Series',
      reliability: 'High Reliability',
      logoColor: 'from-red-500 to-red-600',
    },
    {
      id: '3',
      team: 'Team Envy',
      logo: 'TE',
      time: '9:00–11:00 PM EST',
      date: 'Dec 18',
      region: 'NA',
      tier: 'Tier 1',
      mode: 'HP Only',
      reliability: 'Medium Reliability',
      logoColor: 'from-blue-500 to-blue-600',
    },
    {
      id: '4',
      team: 'London Royal Ravens',
      logo: 'LR',
      time: '3:00–5:00 PM GMT',
      date: 'Tomorrow',
      region: 'EU',
      tier: 'Tier 1',
      mode: 'Search Only',
      reliability: 'High Reliability',
      logoColor: 'from-purple-500 to-purple-600',
    },
    {
      id: '5',
      team: 'NYSL Challengers',
      logo: 'NY',
      time: '7:00–9:00 PM EST',
      date: 'Dec 19',
      region: 'NA',
      tier: 'Tier 2',
      mode: '3rd Mode Only',
      reliability: 'High Reliability',
      logoColor: 'from-yellow-500 to-yellow-600',
    },
    {
      id: '6',
      team: 'Atlanta Legion',
      logo: 'AL',
      time: '8:00–10:00 PM EST',
      date: 'Dec 20',
      region: 'NA',
      tier: 'Tier 1',
      mode: 'Full Series',
      reliability: 'Medium Reliability',
      logoColor: 'from-pink-500 to-pink-600',
    },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl mb-1">Scrim Center</h1>
          <p className="text-gray-400">Find and book scrims with top teams</p>
        </div>
        
        <Button onClick={onCreateScrim} className="hidden sm:flex">
          <Plus className="w-4 h-4" />
          Post Scrim Slot
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-4 text-gray-400">
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filters</span>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-2">
            <label className="text-xs text-gray-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Time Window
            </label>
            <select 
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Times</option>
              <option value="tonight">Tonight</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="week">This Week</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Region
            </label>
            <select 
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Regions</option>
              <option value="na">NA</option>
              <option value="eu">EU</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              Tier
            </label>
            <select 
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/50 border border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Tiers</option>
              <option value="t1">Tier 1</option>
              <option value="t2">Tier 2</option>
              <option value="t3">Tier 3</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 flex items-center gap-1.5">
              <Gamepad2 className="w-3.5 h-3.5" />
              Scrim Type
            </label>
            <select className="w-full px-3 py-2 bg-gray-900/50 border border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Types</option>
              <option value="full">Full Series</option>
              <option value="hp">HP Only</option>
              <option value="search">Search Only</option>
              <option value="third">3rd Mode Only</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-400">
          {availableScrims.length} available scrims
        </p>
      </div>

      {/* Scrim Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableScrims.map((scrim) => (
          <Card key={scrim.id} className="p-5 space-y-4 hover:scale-[1.02] transition-transform">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 bg-gradient-to-br ${scrim.logoColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <span>{scrim.logo}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="truncate mb-1">{scrim.team}</h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  <span>{scrim.reliability}</span>
                </div>
              </div>
            </div>

            {/* Time & Date */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-blue-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{scrim.time}</span>
              </div>
              <div className="text-sm text-gray-400 pl-6">{scrim.date}</div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              <Tag variant="info">{scrim.mode}</Tag>
              <Tag>{scrim.region}</Tag>
              <Tag variant="purple">{scrim.tier}</Tag>
            </div>

            {/* Action Button */}
            <Button 
              onClick={() => onViewScrimDetails(scrim.id)}
              variant="secondary" 
              className="w-full"
            >
              Request Scrim
            </Button>
          </Card>
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
