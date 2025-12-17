import { Plus, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';

interface TopNavProps {
  onCreateScrim: () => void;
}

export function TopNav({ onCreateScrim }: TopNavProps) {
  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0b] border-b border-gray-800">
      <div className="px-4 lg:px-6 h-16 flex items-center justify-between">
        {/* Logo/Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white rounded" />
          </div>
          <div>
            <h1 className="text-lg tracking-tight">Scrim Center</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Passion. Potential. Performance.</p>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <Button onClick={onCreateScrim} className="hidden sm:flex">
            <Plus className="w-4 h-4" />
            Post Scrim
          </Button>
          
          {/* Team Selector */}
          <button className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center text-xs">
              VP
            </div>
            <span className="text-sm">Vanguard Prime</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {/* User Avatar */}
          <button className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-sm">
            JD
          </button>
        </div>
      </div>
    </nav>
  );
}
