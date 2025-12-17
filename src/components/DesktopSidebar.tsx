import { LucideIcon } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface DesktopSidebarProps {
  navItems: NavItem[];
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export function DesktopSidebar({ navItems, currentScreen, onNavigate }: DesktopSidebarProps) {
  return (
    <aside className="hidden lg:block w-64 border-r border-gray-800 min-h-[calc(100vh-4rem)] bg-[#0a0a0b]">
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900/50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
