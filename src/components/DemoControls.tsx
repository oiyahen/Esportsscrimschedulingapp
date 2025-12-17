import { Settings } from 'lucide-react';
import { useState } from 'react';

interface DemoControlsProps {
  onShowOnboarding: () => void;
}

export function DemoControls({ onShowOnboarding }: DemoControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-28 lg:bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-3 bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-2xl">
          <p className="text-sm text-gray-400 mb-3">Demo Controls</p>
          <button
            onClick={() => {
              onShowOnboarding();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all text-sm"
          >
            View Region Selection
          </button>
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-gray-800 border border-gray-700 rounded-full shadow-2xl flex items-center justify-center hover:bg-gray-700 transition-all"
      >
        <Settings className="w-5 h-5" />
      </button>
    </div>
  );
}
