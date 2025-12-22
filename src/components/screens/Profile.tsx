import { useState } from 'react';
import {
  User,
  Mail,
  MapPin,
  Calendar,
  Settings,
  Trophy,
  Target,
  Clock,
  Bell,
  Shield,
  LogOut,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tag } from '../ui/Tag';

interface ProfileProps {
  onNavigateToRegionSelection?: () => void;
  profile?: any | null;
  onUpdateProfile?: (updates: {
    username?: string;
    handle?: string;
    email?: string;
    primary_team?: string;
  }) => void;
}

export function Profile({ onNavigateToRegionSelection, profile, onUpdateProfile }: ProfileProps = {}) {
  const displayUsername = profile?.username ?? 'JohnDoe';

  const initials = (() => {
    const name = displayUsername.trim();
    if (!name) return 'P';

    const parts = name.split(' ').filter(Boolean);

    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    if (parts[0].length >= 2) {
      return (parts[0][0] + parts[0][1]).toUpperCase();
    }

    return parts[0][0].toUpperCase();
  })();

  // Map internal region IDs to nice labels
  const REGION_LABELS: Record<string, string> = {
    'pacific-nw': 'Pacific NW',
    'pacific-sw': 'Pacific SW',
    'central-north': 'Central N',
    'central-south': 'Central S',
    'atlantic-north': 'Atlantic N',
    'atlantic-south': 'Atlantic S',
  };

  const rawRegion: string = profile?.primary_region ?? '';
  const displayRegion =
    rawRegion && REGION_LABELS[rawRegion]
      ? REGION_LABELS[rawRegion]
      : rawRegion || 'Region not set';

  const rawHandle: string | undefined = profile?.handle;
  const displayHandle =
    rawHandle && rawHandle.length > 0
      ? rawHandle.startsWith('@')
        ? rawHandle
        : `@${rawHandle}`
      : `@${displayUsername.toLowerCase() || 'player'}`;

  const displayEmail = profile?.email ?? 'email@example.com';
  const displayTeam = profile?.primary_team ?? 'Vanguard Prime';

  let memberSince = 'January 2024';
  if (profile?.created_at) {
    const date = new Date(profile.created_at);
    if (!isNaN(date.getTime())) {
      memberSince = date.toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    }
  }

  // Local edit state
  const [isEditing, setIsEditing] = useState(false);
  const [formUsername, setFormUsername] = useState(displayUsername);
  const [formHandle, setFormHandle] = useState(rawHandle ?? '');
  const [formEmail, setFormEmail] = useState(profile?.email ?? '');
  const [formTeam, setFormTeam] = useState(profile?.primary_team ?? '');
  const [formError, setFormError] = useState<string | null>(null);

  const startEditing = () => {
    setFormUsername(displayUsername);
    setFormHandle(rawHandle ?? '');
    setFormEmail(profile?.email ?? '');
    setFormTeam(profile?.primary_team ?? '');
    setFormError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setFormError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!onUpdateProfile) {
      console.warn('[Profile] onUpdateProfile not provided');
      return;
    }

    setFormError(null);

    const trimmedUsername = formUsername.trim();
    const trimmedHandle = formHandle.trim();
    const trimmedEmail = formEmail.trim();
    const trimmedTeam = formTeam.trim();

    // Username required
    if (!trimmedUsername) {
      setFormError('Username is required.');
      return;
    }

    // Handle: no spaces if provided
    if (trimmedHandle && /\s/.test(trimmedHandle)) {
      setFormError('Handle cannot contain spaces.');
      return;
    }

    // Email: basic format check if provided
    if (trimmedEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(trimmedEmail)) {
        setFormError('Please enter a valid email address.');
        return;
      }
    }

    await onUpdateProfile({
      username: trimmedUsername,
      handle: trimmedHandle || undefined,
      email: trimmedEmail || undefined,
      primary_team: trimmedTeam || undefined,
    });

    setIsEditing(false);
  };

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
                {initials}
              </div>

              {/* Displayed name + handle */}
              {!isEditing && (
                <>
                  <h2 className="text-xl mb-1">{displayUsername}</h2>
                  <p className="text-sm text-gray-400 mb-4">{displayHandle}</p>
                </>
              )}

              {/* Edit form */}
              {isEditing && (
                <div className="w-full space-y-3 mb-4">
                  {/* Username */}
                  <div className="text-left">
                    <label className="block text-xs text-gray-400 mb-1">Username</label>
                    <input
                      type="text"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      className="w-full rounded-lg bg-gray-900/70 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Handle */}
                  <div className="text-left">
                    <label className="block text-xs text-gray-400 mb-1">Handle</label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">@</span>
                      <input
                        type="text"
                        value={formHandle}
                        onChange={(e) => setFormHandle(e.target.value.replace(/^@/, ''))}
                        className="w-full rounded-lg bg-gray-900/70 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="your_handle"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="text-left">
                    <label className="block text-xs text-gray-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full rounded-lg bg-gray-900/70 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="email@example.com"
                    />
                  </div>

                  {/* Primary Team */}
                  <div className="text-left">
                    <label className="block text-xs text-gray-400 mb-1">Current Team</label>
                    <input
                      type="text"
                      value={formTeam}
                      onChange={(e) => setFormTeam(e.target.value)}
                      className="w-full rounded-lg bg-gray-900/70 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="Your main team name"
                    />
                  </div>

                  {/* Error message */}
                  {formError && (
                    <p className="text-xs text-red-400 mt-1">{formError}</p>
                  )}
                </div>
              )}

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

              {/* Edit / Cancel + Save buttons */}
              <div className="w-full space-y-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    if (isEditing) {
                      cancelEditing();
                    } else {
                      startEditing();
                    }
                  }}
                >
                  <Settings className="w-4 h-4" />
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </Button>

                {isEditing && (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-500"
                    onClick={handleSave}
                    disabled={!onUpdateProfile}
                  >
                    Save Changes
                  </Button>
                )}
              </div>
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
                  <div className="text-sm truncate">{displayEmail}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-400">Region</div>
                  <div className="text-sm">{displayRegion}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-400">Member Since</div>
                  <div className="text-sm">{memberSince}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-400">Current Team</div>
                  <div className="text-sm">{displayTeam}</div>
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
