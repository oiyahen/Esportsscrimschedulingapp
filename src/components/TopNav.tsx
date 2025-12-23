import { Plus, ChevronDown, LogIn, LogOut } from 'lucide-react';
import { Button } from './ui/Button';

interface TopNavProps {
  onCreateScrim: () => void;
  profile?: any | null;
  isAuthed: boolean;          // ✅ add this
  onSignOut: () => void;
}



export function TopNav({ onCreateScrim, profile, isAuthed, onSignOut }: TopNavProps) {
  const displayUsername = profile?.username ?? 'JohnDoe';
  const displayTeam = profile?.primary_team ?? 'Vanguard Prime';

  const initials = (() => {
    const name = displayUsername.trim();
    if (!name) return 'P';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts[0].length >= 2) return (parts[0][0] + parts[0][1]).toUpperCase();
    return parts[0][0].toUpperCase();
  })();

  const teamTag = (() => {
    const name = displayTeam.trim();
    if (!name) return 'VP';
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = parts.map((p) => p[0]).join('');
    return letters.slice(0, 2).toUpperCase();
  })();

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0b] border-b border-gray-800">
      <div className="px-4 lg:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white rounded" />
          </div>
          <div>
            <h1 className="text-lg tracking-tight">Scrim Center</h1>
            <p className="text-xs text-gray-500 hidden sm:block">
              Passion. Potential. Performance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={onCreateScrim} className="hidden sm:flex" disabled={!isAuthed}>
            <Plus className="w-4 h-4" />
            Post Scrim
          </Button>

          <button className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center text-xs">
              {teamTag}
            </div>
            <span className="text-sm">{displayTeam}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          <button className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-sm">
            {initials}
          </button>

          {isAuthed ? (
           <Button onClick={onSignOut} className="hidden sm:flex">
            Sign out
          </Button>

          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-800 text-sm text-gray-400">
              <LogIn className="w-4 h-4" />
              Not signed in
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
