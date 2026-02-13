'use client';

import React from 'react';
import { TrendingDown, TrendingUp, Minus, Dumbbell, Target } from 'lucide-react';
import { BrandConfig } from '@/hooks/useBrandConfig';

interface ShareProgressSummaryCardProps {
  clientName: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  weightData: {
    startWeight: number;
    currentWeight: number;
    lowestWeight: number;
    trend: 'up' | 'down' | 'stable';
    weeklyChange: number;
  };
  workoutsCompleted: number;
  consistencyScore: number;
  isScreenshotMode?: boolean;
  hideFooter?: boolean;
  hideHeader?: boolean;
  compactMode?: boolean;
  unitPreference?: 'lbs' | 'kg';
  brand?: BrandConfig | null;
}

export default function ShareProgressSummaryCard({
  clientName,
  dateRangeStart,
  dateRangeEnd,
  weightData,
  workoutsCompleted,
  consistencyScore,
  isScreenshotMode = false,
  hideFooter = false,
  hideHeader = false,
  compactMode = false,
  unitPreference = 'lbs',
  brand
}: ShareProgressSummaryCardProps) {
  const primaryColor = brand?.primary_color || '#2563EB';
  const accentColor = brand?.accent_color || '#1D4ED8';
  // Unit conversion helpers
  const convertWeight = (lbs: number): number => unitPreference === 'kg' ? lbs * 0.453592 : lbs;
  const weightUnit = unitPreference === 'kg' ? 'kg' : 'lbs';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const weightChange = convertWeight(weightData.currentWeight - weightData.startWeight);
  const _weightChangeAbs = Math.abs(weightChange);

  const getTrendIcon = () => {
    if (weightData.trend === 'down') {
      return <TrendingDown className="w-6 h-6 text-green-500" />;
    } else if (weightData.trend === 'up') {
      return <TrendingUp className="w-6 h-6 text-orange-500" />;
    }
    return <Minus className="w-6 h-6 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (weightData.trend === 'down') return 'text-green-600';
    if (weightData.trend === 'up') return 'text-orange-600';
    return 'text-gray-600';
  };

  return (
    <div
      id="share-progress-summary"
      className={`bg-white overflow-hidden ${hideHeader ? 'rounded-xl' : 'rounded-2xl shadow-lg'} ${isScreenshotMode ? 'p-8' : 'p-6'}`}
      style={{ width: hideHeader ? '100%' : (isScreenshotMode ? '400px' : '100%'), maxWidth: hideHeader ? 'none' : '400px' }}
    >
      {/* Header with gradient accent */}
      {!hideHeader && (
        <div className="mb-6">
          <div
            className="h-1 w-16 rounded-full mb-4"
            style={{ background: `linear-gradient(to right, ${primaryColor}, ${accentColor})` }}
          />
          {brand?.logo_url && (
            <div className="mb-3">
              <img src={brand.logo_url} alt="" className="h-8 object-contain" />
            </div>
          )}
          {brand?.business_name && (
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{brand.business_name}</p>
          )}
          <h2 className="text-xl font-bold text-gray-900">{clientName}</h2>
          <p className="text-sm text-gray-500">
            {formatDate(dateRangeStart)} - {formatDate(dateRangeEnd)}
          </p>
        </div>
      )}

      {/* Weight Progress - Main Feature (hidden in compact mode since chart shows this) */}
      {!compactMode && (
        <div className="rounded-xl p-5 mb-5" style={{ background: `linear-gradient(to bottom right, ${primaryColor}10, ${accentColor}10)` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600">Weight Progress</span>
            {getTrendIcon()}
          </div>

          <div className="flex items-end gap-3 mb-2">
            <span className={`text-4xl font-bold ${getTrendColor()}`}>
              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
            </span>
            <span className="text-lg text-gray-500 mb-1">{weightUnit}</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div>
              <span className="text-gray-400">Start:</span>{' '}
              <span className="font-medium">{convertWeight(weightData.startWeight).toFixed(1)} {weightUnit}</span>
            </div>
            <div className="w-px h-4 bg-gray-300" />
            <div>
              <span className="text-gray-400">Current:</span>{' '}
              <span className="font-medium">{convertWeight(weightData.currentWeight).toFixed(1)} {weightUnit}</span>
            </div>
          </div>

          {weightData.weeklyChange !== 0 && (
            <div className="mt-3 text-xs text-gray-500">
              Avg: {weightData.weeklyChange > 0 ? '+' : ''}{convertWeight(weightData.weeklyChange).toFixed(2)} {weightUnit}/week
            </div>
          )}
        </div>
      )}

      {/* Stats Grid (hidden in compact mode for full report view) */}
      {!compactMode && (
        <div className="grid grid-cols-2 gap-4">
          {/* Workouts Completed */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="w-4 h-4" style={{ color: primaryColor }} />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Workouts</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{workoutsCompleted}</div>
            <div className="text-xs text-gray-500">completed</div>
          </div>

          {/* Consistency Score */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4" style={{ color: primaryColor }} />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Consistency</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{Math.round(consistencyScore)}%</div>
            <div className="text-xs text-gray-500">overall</div>
          </div>
        </div>
      )}

      {/* Branding Footer */}
      {!hideFooter && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          {brand?.footer_text && (
            <p className="text-xs text-gray-500 text-center whitespace-pre-line mb-1">{brand.footer_text}</p>
          )}
          {(brand?.show_fitreport_badge !== false) && (
            <div className="flex items-center justify-center">
              <span className="text-xs text-gray-400">Powered by FitReport</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
