import { ArrowLeft, Edit, X, Check, Clock, MapPin, Users, MessageSquare, Calendar } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';
import { StatusChip } from '../ui/StatusChip';

interface ScrimDetailsProps {
  scrimId: string | null;
  onBack: () => void;
}

export function ScrimDetails({ scrimId, onBack }: ScrimDetailsProps) {
  const scrim = {
    id: scrimId,
    date: 'Monday, Dec 16, 2024',
    time: '8:00–10:00 PM EST',
    opponent: 'OpTic Red',
    opponentLogo: 'OR',
    status: 'confirmed' as const,
    region: 'NA',
    tier: 'Tier 1',
    mode: 'BO6 HP/SND',
    notes: 'Looking for competitive practice before our qualifier. Please be on time and ready to run full series.',
  };

  const roster = [
    { name: 'PlayerOne', role: 'Main AR' },
    { name: 'QuickScope', role: 'Entry Sub' },
    { name: 'Anchor', role: 'Flex' },
    { name: 'Strategist', role: 'IGL' },
  ];

  const opponentRoster = [
    { name: 'Shotzzy', role: 'SMG' },
    { name: 'iLLeY', role: 'Flex' },
    { name: 'Pred', role: 'AR' },
    { name: 'Ghosty', role: 'Sub' },
  ];

  const messages = [
    {
      id: 1,
      user: 'PlayerOne',
      avatar: 'P1',
      message: 'Confirmed for 8 PM. See you then!',
      timestamp: '2 hours ago',
    },
    {
      id: 2,
      user: 'Shotzzy',
      avatar: 'SZ',
      message: 'Perfect. We\'ll be ready.',
      timestamp: '1 hour ago',
    },
    {
      id: 3,
      user: 'PlayerOne',
      avatar: 'P1',
      message: 'Should we do HP warmup first?',
      timestamp: '30 min ago',
    },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-900/50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl mb-1">Scrim Details</h1>
          <p className="text-gray-400">{scrim.date}</p>
        </div>
        <StatusChip status={scrim.status} />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Matchup Card */}
          <Card className="p-6">
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-xl lg:text-2xl mb-2 mx-auto">
                  VP
                </div>
                <div className="text-lg">Vanguard Prime</div>
                <div className="text-sm text-gray-400">Your Team</div>
              </div>

              <div className="text-3xl lg:text-4xl text-gray-600">VS</div>

              <div className="text-center">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-xl lg:text-2xl mb-2 mx-auto">
                  {scrim.opponentLogo}
                </div>
                <div className="text-lg">{scrim.opponent}</div>
                <div className="text-sm text-gray-400">Opponent</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-800">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-400">Time</div>
                  <div>{scrim.time}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-400">Region</div>
                  <div>{scrim.region}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-400">Mode</div>
                  <div>{scrim.mode}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-400">Tier</div>
                  <div>{scrim.tier}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Rosters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Your Roster
              </h3>
              <div className="space-y-3">
                {roster.map((player, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-xs">
                        {player.name.substring(0, 2)}
                      </div>
                      <span>{player.name}</span>
                    </div>
                    <span className="text-sm text-gray-400">{player.role}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-400" />
                Opponent Roster
              </h3>
              <div className="space-y-3">
                {opponentRoster.map((player, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-xs">
                        {player.name.substring(0, 2)}
                      </div>
                      <span>{player.name}</span>
                    </div>
                    <span className="text-sm text-gray-400">{player.role}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Notes */}
          <Card className="p-5">
            <h3 className="text-lg mb-3">Notes</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{scrim.notes}</p>
          </Card>

          {/* Desktop Actions */}
          <div className="hidden lg:flex gap-3">
            <Button variant="secondary" className="flex-1">
              <Edit className="w-4 h-4" />
              Edit Scrim
            </Button>
            <Button variant="ghost" className="flex-1 text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
              Cancel Scrim
            </Button>
            <Button className="flex-1">
              <Check className="w-4 h-4" />
              Mark as Completed
            </Button>
          </div>
        </div>

        {/* Right Column - Activity/Messages */}
        <div className="lg:col-span-1">
          <Card className="p-5 h-full">
            <h3 className="text-lg mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              Activity
            </h3>
            
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">
                    {msg.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm">{msg.user}</span>
                      <span className="text-xs text-gray-500">{msg.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all">
                  Send
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Mobile Sticky Actions */}
      <div className="lg:hidden fixed bottom-20 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b] to-transparent z-40">
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" className="text-red-400">
            <X className="w-4 h-4" />
            Cancel
          </Button>
          <Button>
            <Check className="w-4 h-4" />
            Complete
          </Button>
        </div>
      </div>
    </div>
  );
}
