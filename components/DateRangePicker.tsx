'use client';

import { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface DateRangePickerProps {
  from: Date | undefined;
  to: Date | undefined;
  onSelect: (range: { from: Date | undefined; to: Date | undefined }) => void;
  showPresets?: boolean;
  className?: string;
}

type PresetOption = {
  label: string;
  value: string;
  getRange: () => { from: Date; to: Date };
};

export function DateRangePicker({ 
  from, 
  to, 
  onSelect, 
  showPresets = true,
  className = "" 
}: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');

  const formatDate = (date: Date | undefined) => {
    return date ? format(date, 'yyyy-MM-dd') : '';
  };

  const today = new Date();
  const yesterday = subDays(today, 1);
  
  const presetOptions: PresetOption[] = [
    {
      label: 'Last 7 days',
      value: 'last7',
      getRange: () => ({
        from: subDays(today, 7), // 7 days ago to yesterday = 7 complete days
        to: yesterday
      })
    },
    {
      label: 'Last 14 days',
      value: 'last14',
      getRange: () => ({
        from: subDays(today, 14),
        to: yesterday
      })
    },
    {
      label: 'Last 30 days',
      value: 'last30',
      getRange: () => ({
        from: subDays(today, 30),
        to: yesterday
      })
    },
    {
      label: 'This month',
      value: 'thisMonth',
      getRange: () => ({
        from: startOfMonth(today),
        to: today
      })
    },
    {
      label: 'Last month',
      value: 'lastMonth',
      getRange: () => {
        const lastMonth = subMonths(today, 1);
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth)
        };
      }
    }
  ];

  const handlePresetClick = (preset: PresetOption) => {
    const range = preset.getRange();
    setSelectedPreset(preset.value);
    onSelect({ from: range.from, to: range.to });
  };

  const handleCustomDateChange = (field: 'from' | 'to', value: string) => {
    setSelectedPreset('custom');
    const newDate = value ? new Date(value) : undefined;
    
    if (field === 'from') {
      onSelect({ from: newDate, to });
    } else {
      onSelect({ from, to: newDate });
    }
  };

  const getDurationText = () => {
    if (!from || !to) return '';
    
    const diffTime = to.getTime() - from.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
    
    if (diffDays === 1) return '1 day selected';
    return `${diffDays} days selected`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {showPresets && (
        <div className="space-y-3">
          <label className="label">
            <span className="label-text font-semibold text-white">Quick Select</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {presetOptions.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedPreset === preset.value
                    ? 'btn-gradient'
                    : 'glass border border-white/10 hover:border-accent-purple/50 text-white'
                }`}
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPreset === 'custom'
                  ? 'btn-gradient'
                  : 'glass border border-white/10 hover:border-accent-purple/50 text-white'
              }`}
              onClick={() => setSelectedPreset('custom')}
            >
              Custom
            </button>
          </div>
        </div>
      )}

      {/* Date Duration Display */}
      {from && to && (
        <div className="glass border border-purple-500/30 bg-purple-500/10 p-4 rounded-lg flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6 text-purple-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span className="text-gray-300">
            <strong className="text-white">{getDurationText()}</strong> - {format(from, 'MMM d, yyyy')} to {format(to, 'MMM d, yyyy')}
          </span>
        </div>
      )}

      {/* Custom Date Inputs */}
      {(selectedPreset === 'custom' || !showPresets) && (
        <div className="space-y-3">
          <label className="label">
            <span className="label-text font-semibold text-white">Custom Date Range</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-gray-300">Start Date</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  className="glass border border-white/10 bg-white/5 text-white focus:border-accent-purple focus:outline-none focus:ring-2 focus:ring-accent-purple/50 rounded-lg px-4 py-3 w-full pr-10"
                  value={formatDate(from)}
                  onChange={(e) => handleCustomDateChange('from', e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text text-gray-300">End Date</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  className="glass border border-white/10 bg-white/5 text-white focus:border-accent-purple focus:outline-none focus:ring-2 focus:ring-accent-purple/50 rounded-lg px-4 py-3 w-full pr-10"
                  value={formatDate(to)}
                  min={formatDate(from)}
                  max={formatDate(today)}
                  onChange={(e) => handleCustomDateChange('to', e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 