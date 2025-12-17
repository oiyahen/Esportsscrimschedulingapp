import { useState } from 'react';
import { ArrowLeft, MapPin, Check } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface RegionSelectionProps {
  onComplete?: () => void;
  onBack?: () => void;
}

export function RegionSelection({ onComplete, onBack }: RegionSelectionProps) {
  const [selectedPrimary, setSelectedPrimary] = useState<string>('');
  const [nearbyRegions, setNearbyRegions] = useState<string[]>([]);

  const regions = [
    { id: 'pacific-nw', label: 'Pacific NW', x: 10, y: 35, width: 18, height: 22 },
    { id: 'pacific-sw', label: 'Pacific SW', x: 10, y: 57, width: 18, height: 25 },
    { id: 'central-north', label: 'Central N', x: 35, y: 32, width: 20, height: 23 },
    { id: 'central-south', label: 'Central S', x: 35, y: 55, width: 20, height: 27 },
    { id: 'atlantic-north', label: 'Atlantic N', x: 62, y: 28, width: 20, height: 25 },
    { id: 'atlantic-south', label: 'Atlantic S', x: 62, y: 53, width: 20, height: 29 },
  ];

  const handleRegionClick = (regionId: string) => {
    setSelectedPrimary(regionId);
    // Remove from nearby if it was selected
    setNearbyRegions(prev => prev.filter(id => id !== regionId));
  };

  const toggleNearbyRegion = (regionId: string) => {
    if (regionId === selectedPrimary) return;
    
    setNearbyRegions(prev =>
      prev.includes(regionId)
        ? prev.filter(id => id !== regionId)
        : [...prev, regionId]
    );
  };

  const availableNearbyRegions = regions.filter(r => r.id !== selectedPrimary);

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        )}

        {/* Main Card */}
        <Card className="p-6 lg:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8" />
            </div>
            <h1 className="text-2xl lg:text-3xl mb-2">Choose your region</h1>
            <p className="text-gray-400 max-w-lg mx-auto">
              We'll use this to find scrims with better ping and similar scrim times.
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
                  {/* Map Regions */}
                  {regions.map((region) => {
                    const isSelected = selectedPrimary === region.id;
                    const isNearby = nearbyRegions.includes(region.id);
                    
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
                              : isNearby
                              ? 'fill-purple-500/20 stroke-purple-500 stroke-1'
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
                            isSelected
                              ? 'fill-blue-400'
                              : isNearby
                              ? 'fill-purple-400'
                              : 'fill-gray-400'
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

          {/* Primary Region Display */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Primary Region</label>
            <div className="px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl">
              {selectedPrimary ? (
                <div className="flex items-center gap-2 text-blue-400">
                  <MapPin className="w-4 h-4" />
                  <span>{regions.find(r => r.id === selectedPrimary)?.label}</span>
                </div>
              ) : (
                <span className="text-gray-500">Select a region on the map</span>
              )}
            </div>
          </div>

          {/* Nearby Regions */}
          {selectedPrimary && (
            <div className="mb-8">
              <label className="block text-sm text-gray-400 mb-3">
                Nearby Regions <span className="text-gray-600">(optional)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableNearbyRegions.map((region) => {
                  const isChecked = nearbyRegions.includes(region.id);
                  return (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => toggleNearbyRegion(region.id)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                        isChecked
                          ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                          : 'border-gray-800 bg-gray-900/50 text-gray-400 hover:border-gray-700'
                      }`}
                    >
                      <span className="text-sm">{region.label}</span>
                      {isChecked && <Check className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={onComplete}
              disabled={!selectedPrimary}
              className="flex-1"
            >
              Continue
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}