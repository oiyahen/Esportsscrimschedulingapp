import { useState } from 'react';
import { X, Calendar, Clock, MapPin, Trophy, Gamepad2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Tag } from '../ui/Tag';

interface CreateScrimSlotProps {
  onClose: () => void;
}

export function CreateScrimSlot({ onClose }: CreateScrimSlotProps) {
  const [selectedModes, setSelectedModes] = useState<string[]>([]);

  const gameModes = [
    { id: 'hp', label: 'Hardpoint' },
    { id: 'snd', label: 'Search & Destroy' },
    { id: 'control', label: 'Control' },
    { id: 'full', label: 'Full Series' },
  ];

  const toggleMode = (modeId: string) => {
    setSelectedModes(prev =>
      prev.includes(modeId)
        ? prev.filter(id => id !== modeId)
        : [...prev, modeId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    onClose();
  };

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl mb-1">Post Scrim Slot</h1>
          <p className="text-gray-400">Create an available scrim slot for other teams</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-900/50 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Form */}
      <Card className="p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Picker */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-300 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date
            </label>
            <input
              type="date"
              className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>

          {/* Start Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm text-gray-300 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Start Time
              </label>
              <input
                type="time"
                className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-gray-300 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Duration
              </label>
              <select className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                <option>1 hour</option>
                <option>1.5 hours</option>
                <option>2 hours</option>
                <option>2.5 hours</option>
                <option>3 hours</option>
              </select>
            </div>
          </div>

          {/* Region */}
          <Select
            label="Region"
            options={[
              { value: 'na', label: 'North America (NA)' },
              { value: 'eu', label: 'Europe (EU)' },
              { value: 'apac', label: 'Asia Pacific (APAC)' },
            ]}
          />

          {/* Preferred Tier */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-300 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Preferred Tier
            </label>
            <select className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
              <option>Any Tier</option>
              <option>Tier 1</option>
              <option>Tier 2</option>
              <option>Tier 3</option>
            </select>
          </div>

          {/* Game Mode Selection */}
          <div className="space-y-3">
            <label className="block text-sm text-gray-300 flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              Game Modes
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {gameModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => toggleMode(mode.id)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all ${
                    selectedModes.includes(mode.id)
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <label className="block text-sm text-gray-300">
              Optional Notes
            </label>
            <textarea
              rows={4}
              placeholder="Add any specific requirements or preferences..."
              className="w-full px-4 py-2.5 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Advanced Options Link */}
          <button type="button" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            + Advanced options
          </button>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Post Slot
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
