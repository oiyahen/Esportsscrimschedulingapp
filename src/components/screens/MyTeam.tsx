import { Users, MapPin, Trophy, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Tag } from '../ui/Tag';

export function MyTeam() {
  const teamMembers = [
    { name: 'PlayerOne', role: 'Main AR', status: 'online' },
    { name: 'QuickScope', role: 'Entry Sub', status: 'online' },
    { name: 'Anchor', role: 'Flex', status: 'away' },
    { name: 'Strategist', role: 'IGL', status: 'offline' },
    { name: 'SubPlayer', role: 'Substitute', status: 'offline' },
  ];

  const stats = [
    {
      label: 'Scrims This Week',
      value: '12',
      icon: Calendar,
      color: 'text-blue-400',
    },
    {
      label: 'Confirmed Scrims',
      value: '8',
      icon: CheckCircle2,
      color: 'text-green-400',
    },
    {
      label: 'Pending Scrims',
      value: '3',
      icon: Clock,
      color: 'text-amber-400',
    },
    {
      label: 'Cancelled Scrims',
      value: '1',
      icon: XCircle,
      color: 'text-red-400',
    },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl mb-1">My Team</h1>
        <p className="text-gray-400">Team information and statistics</p>
      </div>

      {/* Team Info Card */}
      <Card className="p-6 lg:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Team Logo */}
          <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center text-4xl lg:text-5xl flex-shrink-0">
            VP
          </div>

          {/* Team Details */}
          <div className="flex-1">
            <h2 className="text-2xl lg:text-3xl mb-2">Vanguard Prime</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <Tag variant="info">
                <MapPin className="w-3 h-3" />
                North America
              </Tag>
              <Tag variant="purple">
                <Trophy className="w-3 h-3" />
                Tier 2
              </Tag>
              <Tag>Call of Duty: BO6</Tag>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Competitive Challengers team looking to make it to the CDL. Focused on consistent practice and improvement.
            </p>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
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

      {/* Team Members */}
      <Card className="p-6">
        <h3 className="text-xl mb-5 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          Team Members
        </h3>

        <div className="space-y-3">
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-900/30 rounded-xl hover:bg-gray-900/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    {member.name.substring(0, 2)}
                  </div>
                  {/* Status Indicator */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-gray-900 ${
                      member.status === 'online'
                        ? 'bg-green-500'
                        : member.status === 'away'
                        ? 'bg-amber-500'
                        : 'bg-gray-600'
                    }`}
                  />
                </div>
                <div>
                  <div className="mb-0.5">{member.name}</div>
                  <div className="text-sm text-gray-400">{member.role}</div>
                </div>
              </div>

              <div className="text-sm text-gray-500 capitalize hidden sm:block">
                {member.status}
              </div>
            </div>
          ))}
        </div>

        <button className="w-full mt-4 px-4 py-3 border border-gray-800 rounded-xl text-gray-400 hover:text-white hover:border-gray-700 transition-colors">
          + Invite Team Member
        </button>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6 mt-6">
        <h3 className="text-xl mb-5">Recent Activity</h3>
        
        <div className="space-y-4">
          <div className="flex gap-3 items-start">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm mb-1">
                <span className="text-white">PlayerOne</span> confirmed scrim vs OpTic Red
              </p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm mb-1">
                <span className="text-white">Strategist</span> posted new scrim slot for Dec 20
              </p>
              <p className="text-xs text-gray-500">5 hours ago</p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm mb-1">
                <span className="text-white">QuickScope</span> completed scrim vs FaZe Academy
              </p>
              <p className="text-xs text-gray-500">1 day ago</p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm mb-1">
                <span className="text-white">Team Envy</span> requested scrim for Dec 18
              </p>
              <p className="text-xs text-gray-500">1 day ago</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
