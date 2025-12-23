import { useMemo } from 'react';
import { Users, MapPin, Trophy, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Tag } from '../ui/Tag';

interface MyTeamProps {
  profile?: any | null;
  scrims?: any[];
}

type TeamMember = {
  name: string;
  role?: string;
  status?: 'online' | 'away' | 'offline';
  handle?: string | null;
};

export function MyTeam({ profile, scrims = [] }: MyTeamProps = {}) {
  const displayTeam = profile?.primary_team ?? 'Vanguard Prime';

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
    rawRegion && REGION_LABELS[rawRegion] ? REGION_LABELS[rawRegion] : rawRegion || 'Region not set';

  const teamTag = (() => {
    const name = displayTeam.trim();
    if (!name) return 'TM';
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = parts.map((p: string) => p[0]).join('');
    return letters.slice(0, 2).toUpperCase();
  })();

  const teamMembers: TeamMember[] = useMemo(() => {
    const fromProfile = profile?.team_members;
    if (Array.isArray(fromProfile) && fromProfile.length) {
      return fromProfile
        .filter(Boolean)
        .slice(0, 10)
        .map((m: any) => ({
          name: m?.name ?? m?.username ?? m?.handle ?? 'Team Member',
          role: m?.role ?? undefined,
          status: (m?.status ?? 'online') as TeamMember['status'],
          handle: m?.handle ? (m.handle.startsWith('@') ? m.handle : `@${m.handle}`) : null,
        }));
    }

    if (profile?.username || profile?.handle) {
      const name = profile?.username || profile?.handle || 'Team Member';
      const handle = profile?.handle ? (profile.handle.startsWith('@') ? profile.handle : `@${profile.handle}`) : null;
      return [{ name, role: undefined, status: 'online', handle }];
    }

    return [
      { name: 'PlayerOne', role: 'Main AR', status: 'online' },
      { name: 'QuickScope', role: 'Entry Sub', status: 'online' },
      { name: 'Anchor', role: 'Flex', status: 'away' },
      { name: 'Strategist', role: 'IGL', status: 'offline' },
      { name: 'SubPlayer', role: 'Substitute', status: 'offline' },
    ];
  }, [profile]);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const getScrimDate = (scrim: any): Date | null => {
    const dateStr = scrim?.scheduled_at || scrim?.created_at || scrim?.date || scrim?.played_at;
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const normalizeStatus = (s: any): string => (s ?? '').toString().trim().toLowerCase();

  const scrimsThisWeek = (Array.isArray(scrims) ? scrims : []).filter((s) => {
    const d = getScrimDate(s);
    if (!d) return false;
    return d >= weekAgo && d <= now;
  }).length;

  const confirmedScrims = (Array.isArray(scrims) ? scrims : []).filter(
    (s) => normalizeStatus(s?.status) === 'confirmed'
  ).length;

  const pendingScrims = (Array.isArray(scrims) ? scrims : []).filter((s) => {
    const st = normalizeStatus(s?.status);
    return st === 'pending' || st === 'open';
  }).length;

  const cancelledScrims = (Array.isArray(scrims) ? scrims : []).filter((s) => {
    const st = normalizeStatus(s?.status);
    return st === 'cancelled' || st === 'canceled';
  }).length;

  const stats = [
    { label: 'Scrims This Week', value: scrimsThisWeek.toString(), icon: Calendar, color: 'text-blue-400' },
    { label: 'Confirmed Scrims', value: confirmedScrims.toString(), icon: CheckCircle2, color: 'text-green-400' },
    { label: 'Pending Scrims', value: pendingScrims.toString(), icon: Clock, color: 'text-amber-400' },
    { label: 'Cancelled Scrims', value: cancelledScrims.toString(), icon: XCircle, color: 'text-red-400' },
  ];

  const formatRelativeTime = (dateStr?: string): string => {
    if (!dateStr) return 'Unknown time';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Unknown time';

    const diffMs = now.getTime() - d.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getOpponentLabel = (s: any): string =>
    s?.opponent_name || s?.opponent_team || s?.opponent || s?.title || s?.match_title || 'Opponent team';

  const getStatusLabel = (s: any): string => {
    const status = normalizeStatus(s?.status);
    if (!status) return 'Scrim updated';
    if (status === 'confirmed') return 'Scrim confirmed';
    if (status === 'pending' || status === 'open') return 'Scrim posted';
    if (status === 'cancelled' || status === 'canceled') return 'Scrim cancelled';
    return `Scrim ${status}`;
  };

  const recentScrims = useMemo(() => {
    const arr = Array.isArray(scrims) ? [...scrims] : [];
    arr.sort((a, b) => {
      const da = getScrimDate(a)?.getTime() ?? 0;
      const db = getScrimDate(b)?.getTime() ?? 0;
      return db - da;
    });
    return arr.slice(0, 4);
  }, [scrims]);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl mb-1">My Team</h1>
        <p className="text-gray-400">Team information and statistics</p>
      </div>

      <Card className="p-6 lg:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center text-4xl lg:text-5xl flex-shrink-0">
            {teamTag}
          </div>

          <div className="flex-1">
            <h2 className="text-2xl lg:text-3xl mb-2">{displayTeam}</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <Tag variant="info">
                <MapPin className="w-3 h-3" />
                {displayRegion}
              </Tag>
              <Tag variant="purple">
                <Trophy className="w-3 h-3" />
                Tier 2
              </Tag>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Competitive team looking to level up through consistent practice and high-quality scrims.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-3xl lg:text-4xl mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <h3 className="text-xl mb-5 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          Team Members
        </h3>

        <div className="space-y-3">
          {teamMembers.map((member, index) => {
            const initials = (member.name || 'TM').trim().slice(0, 2).toUpperCase();
            const status = member.status ?? 'offline';

            return (
              <div
                key={`${member.name}-${index}`}
                className="flex items-center justify-between p-4 bg-gray-900/30 rounded-xl hover:bg-gray-900/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                      {initials}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-gray-900 ${
                        status === 'online' ? 'bg-green-500' : status === 'away' ? 'bg-amber-500' : 'bg-gray-600'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="mb-0.5">{member.name}</div>
                    <div className="text-sm text-gray-400">
                      {member.role ?? member.handle ?? 'Team member'}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-500 capitalize hidden sm:block">{status}</div>
              </div>
            );
          })}
        </div>

        <button className="w-full mt-4 px-4 py-3 border border-gray-800 rounded-xl text-gray-400 hover:text-white hover:border-gray-700 transition-colors">
          + Invite Team Member
        </button>
      </Card>

      <Card className="p-6 mt-6">
        <h3 className="text-xl mb-5">Recent Activity</h3>

        {recentScrims.length === 0 ? (
          <p className="text-sm text-gray-500">No scrim activity yet.</p>
        ) : (
          <div className="space-y-4">
            {recentScrims.map((scrim, idx) => (
              <div key={scrim?.id ?? idx} className="flex gap-3 items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm mb-1">
                    <span className="text-white">{getStatusLabel(scrim)}</span> vs {getOpponentLabel(scrim)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatRelativeTime(scrim?.created_at || scrim?.scheduled_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

