import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { Card } from '../ui/Card';

interface RegionSelectionProps {
  onComplete: () => void;
  onBack: () => void;
  currentRegion?: string | null;
  onRegionSelected?: (region: string) => void;
}

export function RegionSelection({
  onComplete,
  onBack,
  currentRegion,
  onRegionSelected,
}: RegionSelectionProps) {
  const [selectedRegion, setSelectedRegion] = useState<string>(currentRegion || '');

  // Single region list – ids should match what you store in Supabase
  const regions = [
    { id: 'pacific-nw', label: 'Pacific NW', x: 10, y: 35, width: 18, height: 22 },
    { id: 'pacific-sw', label: 'Pacific SW', x: 10, y: 57, width: 18, height: 25 },
    { id: 'central-north', label: 'Central N', x: 35, y: 32, width: 20, height: 23 },
    { id: 'central-south', label: 'Central S', x: 35, y: 55, width: 20, height: 27 },
    { id: 'atlantic-north', label: 'Atlantic N', x: 62, y: 28, width: 20, height: 25 },
    { id: 'atlantic-south', label: 'Atlantic S', x: 62, y: 53, width: 20, height: 29 },
  ];

  const handleRegionClick = (regionId: string) => {
    setSelectedRegion(regionId);
  };

  const handleContinue = () => {
    if (onRegionSelected && selectedRegion) {
      onRegionSelected(selectedRegion);
    }
    onComplete();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <Card className="p-6 lg:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8" />
            </div>
            <h1 className="text-2xl lg:text-3xl mb-2">Choose your region</h1>
            <p className="text-gray-400 max-w-lg mx-auto">
              We&apos;ll use this to find scrims with better ping and similar scrim times.
            </p>
          </div>

          {/* Map Container */}
          <div className="mb-8">
            <div className="bg-gray-900/50 rounded-2xl p-6 lg:p-10 border border-gray-800">
              <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                <svg
                  viewBox="0 0 100 100"
                  className="absolute inset-0 w-full h-full"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.1))' }}
                >
                  {regions.map((region) => {
                    const isSelected = selectedRegion === region.id;

                    return (
                      <g key={region.id}>
                        {/* Region Shape */}
                        <rect
                          x={region.x}
                          y={region.y}
                          width={region.width}
                          height={region.height}
                          rx="3"
                          className={`cursor-pointer transition-all ${
                            isSelected
                              ? 'fill-blue-500/30 stroke-blue-500 stroke-2'
                              : 'fill-gray-800/50 stroke-gray-700 stroke-1 hover:fill-gray-700/50 hover:stroke-gray-600'
                          }`}
                          onClick={() => handleRegionClick(region.id)}
                        />

                        {/* Region Label */}
                        <text
                          x={region.x + region.width / 2}
                          y={region.y + region.height / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className={`text-[3.5px] lg:text-[4px] pointer-events-none select-none ${
                            isSelected ? 'fill-blue-400' : 'fill-gray-400'
                          }`}
                          style={{ fontWeight: 600 }}
                        >
                          {region.label}
                        </text>

                        {/* Selected Check Mark */}
                        {isSelected && (
                          <g>
                            <circle
                              cx={region.x + region.width - 2}
                              cy={region.y + 2}
                              r="2.5"
                              className="fill-blue-500"
                            />
                            <text
                              x={region.x + region.width - 2}
                              y={region.y + 2}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className="fill-white text-[2.5px] pointer-events-none"
                            >
                              ✓
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* Region Display */}
          <div className="mb-8">
            <label className="block text-sm text-gray-400 mb-2">Region</label>
            <div className="px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl">
              {selectedRegion ? (
                <div className="flex items-center gap-2 text-blue-400">
                  <MapPin className="w-4 h-4" />
                  <span>{regions.find((r) => r.id === selectedRegion)?.label}</span>
                </div>
              ) : (
                <span className="text-gray-500">Select a region on the map</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center gap-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white hover:bg-gray-900/50 px-4 py-2.5 flex-1"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleContinue}
              disabled={!selectedRegion}
              className="inline-flex items-center justify-center gap-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 px-4 py-2.5 flex-1"
            >
              Continue
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
