import { LucideIcon } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface MobileTabBarProps {
  navItems: NavItem[];
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export function MobileTabBar({ navItems, currentScreen, onNavigate }: MobileTabBarProps) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0b] border-t border-gray-800 z-50">
      <nav className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                isActive ? 'text-blue-500' : 'text-gray-500'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
