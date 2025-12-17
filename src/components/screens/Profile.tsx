import { User, Mail, MapPin, Calendar, Settings, Trophy, Target, Clock, Bell, Shield, LogOut } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';

interface ProfileProps {
  onNavigateToRegionSelection?: () => void;
}

export function Profile({ onNavigateToRegionSelection }: ProfileProps = {}) {
  const userStats = [
    { label: 'Total Scrims', value: '156', icon: Target },
    { label: 'This Month', value: '24', icon: Calendar },
    { label: 'Avg. Per Week', value: '6', icon: Clock },
    { label: 'Completion Rate', value: '94%', icon: Trophy },
  ];

  const recentMatches = [
    { opponent: 'OpTic Red', result: 'Win', score: '3-1', date: 'Dec 15' },
    { opponent: 'FaZe Academy', result: 'Loss', score: '1-3', date: 'Dec 14' },
    { opponent: 'Team Envy', result: 'Win', score: '3-2', date: 'Dec 13' },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl mb-1">Profile</h1>
        <p className="text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-3xl mb-4">
                JD
              </div>
              
              <h2 className="text-xl mb-1">JohnDoe</h2>
              <p className="text-sm text-gray-400 mb-4">@johndoe_gaming</p>

              <div className="flex flex-wrap gap-2 justify-center mb-6">
                <Tag variant="purple">
                  <Trophy className="w-3 h-3" />
                  Tier 2
                </Tag>
                <Tag variant="info">
                  <Target className="w-3 h-3" />
                  Main AR
                </Tag>
              </div>

              <Button className="w-full mb-3">
                <Settings className="w-4 h-4" />
                Edit Profile
              </Button>
            </div>
          </Card>

          {/* Account Info */}
          <Card className="p-5">
            <h3 className="text-lg mb-4">Account Info</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-400">Email</div>
                  <div className="text-sm truncate">john.doe@example.com</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-400">Region</div>
                  <div className="text-sm">Atlantic North</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-400">Member Since</div>
                  <div className="text-sm">January 2024</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-400">Current Team</div>
                  <div className="text-sm">Vanguard Prime</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Stats & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {userStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="p-5">
                  <Icon className="w-5 h-5 text-blue-400 mb-3" />
                  <div className="text-2xl lg:text-3xl mb-1">{stat.value}</div>
                  <div className="text-xs text-gray-400">{stat.label}</div>
                </Card>
              );
            })}
          </div>

          {/* Recent Matches */}
          <Card className="p-6">
            <h3 className="text-xl mb-5">Recent Matches</h3>
            <div className="space-y-3">
              {recentMatches.map((match, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-900/30 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 px-3 py-1.5 rounded-lg text-center text-sm ${
                        match.result === 'Win'
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {match.result}
                    </div>
                    <div>
                      <div className="mb-0.5">vs {match.opponent}</div>
                      <div className="text-sm text-gray-400">{match.score}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">{match.date}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Settings Options */}
          <Card className="p-6">
            <h3 className="text-xl mb-5">Settings</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-4 bg-gray-900/30 rounded-xl hover:bg-gray-900/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-gray-400" />
                  <span>Notifications</span>
                </div>
                <span className="text-sm text-gray-500">→</span>
              </button>

              <button className="w-full flex items-center justify-between p-4 bg-gray-900/30 rounded-xl hover:bg-gray-900/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <span>Privacy & Security</span>
                </div>
                <span className="text-sm text-gray-500">→</span>
              </button>

              <button 
                onClick={onNavigateToRegionSelection}
                className="w-full flex items-center justify-between p-4 bg-gray-900/30 rounded-xl hover:bg-gray-900/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span>Change Region</span>
                </div>
                <span className="text-sm text-gray-500">→</span>
              </button>

              <button className="w-full flex items-center justify-between p-4 bg-gray-900/30 rounded-xl hover:bg-red-900/20 transition-colors text-red-400">
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5" />
                  <span>Sign Out</span>
                </div>
                <span className="text-sm">→</span>
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}