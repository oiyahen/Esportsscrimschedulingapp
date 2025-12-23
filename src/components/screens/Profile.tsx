import { useMemo, useState } from 'react';
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
  scrims?: any[];
  onUpdateProfile?: (updates: {
    username?: string;
    handle?: string;
    email?: string;
    primary_team?: string;
  }) => void;
}

type RecentMatch = {
  opponent: string;
  result: string;
  score?: string;
  date?: string;
  tone?: 'win' | 'loss' | 'neutral';
};

export function Profile(
  { onNavigateToRegionSelection, profile, scrims = [], onUpdateProfile }: ProfileProps = {}
) {
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

  // ---------- Local edit state ----------
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

    if (!trimmedUsername) {
      setFormError('Username is required.');
      return;
    }

    if (trimmedHandle && /\s/.test(trimmedHandle)) {
      setFormError('Handle cannot contain spaces.');
      return;
    }

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

  // ---------- Scrim-based stats + recent matches ----------
  const { userStats, recentMatches } = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const getScrimDate = (s: any): Date | null => {
      const dateStr = s?.scheduled_at ?? s?.created_at ?? s?.date ?? s?.played_at;
      if (!dateStr) return null;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    };

    const totalScrims = Array.isArray(scrims) ? scrims.length : 0;

    const scrimsThisMonth = (Array.isArray(scrims) ? scrims : []).filter((s) => {
      const d = getScrimDate(s);
      if (!d) return false;
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;

    const scrimsLast28Days = (Array.isArray(scrims) ? scrims : []).filter((s) => {
      const d = getScrimDate(s);
      if (!d) return false;
      return d >= twentyEightDaysAgo && d <= now;
    }).length;

    const avgPerWeekRaw = scrimsLast28Days / 4;
    const avgPerWeek =
      scrimsLast28Days === 0 ? '0' : avgPerWeekRaw.toFixed(1).replace(/\.0$/, '');

    const isCompleted = (s: any) => {
      const raw = (s?.status ?? s?.state ?? '').toString().toLowerCase();
      return ['completed', 'played', 'done', 'finished', 'confirmed'].includes(raw);
    };

    const completedScrims = (Array.isArray(scrims) ? scrims : []).filter(isCompleted).length;

    const completionRate =
      totalScrims > 0 ? Math.round((completedScrims / totalScrims) * 100) : 0;

    const stats = [
      { label: 'Total Scrims', value: totalScrims.toString(), icon: Target },
      { label: 'This Month', value: scrimsThisMonth.toString(), icon: Calendar },
      { label: 'Avg. Per Week', value: avgPerWeek, icon: Clock },
      {
        label: 'Completion Rate',
        value: totalScrims > 0 ? `${completionRate}%` : '—',
        icon: Trophy,
      },
    ];

    const formatMatchDate = (d: Date | null) => {
      if (!d) return '';
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric' });
    };

    const getOpponentLabel = (s: any): string => {
      return (
        s?.opponent_name ||
        s?.opponent_team ||
        s?.opponent ||
        s?.title ||
        s?.match_title ||
        'Opponent team'
      );
    };

    const getResultInfo = (s: any): { label: string; tone: 'win' | 'loss' | 'neutral' } => {
      const raw = (s?.result ?? s?.outcome ?? s?.status ?? '').toString().toLowerCase();

      if (raw.includes('win') || raw === 'w') return { label: 'Win', tone: 'win' };
      if (raw.includes('loss') || raw === 'l') return { label: 'Loss', tone: 'loss' };
      if (raw === 'confirmed') return { label: 'Confirmed', tone: 'neutral' };
      if (raw === 'pending' || raw === 'open') return { label: 'Pending', tone: 'neutral' };
      if (raw === 'cancelled' || raw === 'canceled') return { label: 'Cancelled', tone: 'neutral' };

      return { label: raw ? raw[0].toUpperCase() + raw.slice(1) : 'Match', tone: 'neutral' };
    };

    const getScoreLabel = (s: any): string => {
      if (typeof s?.score === 'string' && s.score.trim()) return s.score;
      if (typeof s?.team_score === 'number' && typeof s?.opponent_score === 'number') {
        return `${s.team_score}-${s.opponent_score}`;
      }
      if (typeof s?.teamScore === 'number' && typeof s?.opponentScore === 'number') {
        return `${s.teamScore}-${s.opponentScore}`;
      }
      return '';
    };

    const sorted = [...(Array.isArray(scrims) ? scrims : [])].sort((a, b) => {
      const da = getScrimDate(a)?.getTime() ?? 0;
      const db = getScrimDate(b)?.getTime() ?? 0;
      return db - da;
    });

    const recent: RecentMatch[] = sorted.slice(0, 3).map((s) => {
      const d = getScrimDate(s);
      const { label, tone } = getResultInfo(s);
      return {
        opponent: getOpponentLabel(s),
        result: label,
        score: getScoreLabel(s) || undefined,
        date: formatMatchDate(d) || undefined,
        tone,
      };
    });

    return { userStats: stats, recentMatches: recent };
  }, [scrims]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl mb-1">Profile</h1>
        <p className="text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-3xl mb-4">
                {initials}
              </div>

              {!isEditing && (
                <>
                  <h2 className="text-xl mb-1">{displayUsername}</h2>
                  <p className="text-sm text-gray-400 mb-4">{displayHandle}</p>
                </>
              )}

              {isEditing && (
                <div className="w-full space-y-3 mb-4">
                  <div className="text-left">
                    <label className="block text-xs text-gray-400 mb-1">Username</label>
                    <input
                      type="text"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      className="w-full rounded-lg bg-gray-900/70 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

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

                  {formError && <p className="text-xs text-red-400 mt-1">{formError}</p>}
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

              <div className="w-full space-y-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    if (isEditing) cancelEditing();
                    else startEditing();
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

        <div className="lg:col-span-2 space-y-6">
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

          <Card className="p-6">
            <h3 className="text-xl mb-5">Recent Matches</h3>
            <div className="space-y-3">
              {recentMatches.map((match, index) => {
                const tone = match.tone ?? 'neutral';
                const pill =
                  tone === 'win'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : tone === 'loss'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-gray-500/10 text-gray-300 border border-gray-500/20';

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-900/30 rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-24 px-3 py-1.5 rounded-lg text-center text-sm border ${pill}`}>
                        {match.result}
                      </div>
                      <div>
                        <div className="mb-0.5">vs {match.opponent}</div>
                        {match.score ? (
                          <div className="text-sm text-gray-400">{match.score}</div>
                        ) : (
                          <div className="text-sm text-gray-500">—</div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">{match.date ?? ''}</div>
                  </div>
                );
              })}
            </div>
          </Card>

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

