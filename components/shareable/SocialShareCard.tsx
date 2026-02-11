'use client';

import React from 'react';
import { TrendingDown, TrendingUp, Dumbbell, Footprints, Utensils } from 'lucide-react';
import { BrandConfig } from '@/hooks/useBrandConfig';

type AspectRatio = 'square' | 'story';

interface SocialShareCardProps {
  clientName: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  weightChange?: number;
  currentWeight?: number;
  workoutsCompleted: number;
  avgCalories?: number;
  avgProtein?: number;
  avgDailySteps?: number;
  consistencyScore?: number;
  aspectRatio?: AspectRatio;
  unitPreference?: 'lbs' | 'kg';
  brand?: BrandConfig | null;
}

export default function SocialShareCard({
  clientName,
  dateRangeStart,
  dateRangeEnd,
  weightChange,
  currentWeight,
  workoutsCompleted,
  avgCalories,
  avgProtein,
  avgDailySteps,
  consistencyScore,
  aspectRatio = 'square',
  unitPreference = 'lbs',
  brand
}: SocialShareCardProps) {
  const primaryColor = brand?.primary_color || '#2563EB';
  const accentColor = brand?.accent_color || '#1D4ED8';

  const convertWeight = (lbs: number): number => unitPreference === 'kg' ? lbs * 0.453592 : lbs;
  const weightUnit = unitPreference === 'kg' ? 'kg' : 'lbs';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isSquare = aspectRatio === 'square';
  const width = 540;
  const height = isSquare ? 540 : 960;

  const hasWeightLoss = weightChange !== undefined && weightChange < 0;
  const headline = hasWeightLoss ? 'Weekly Win' : 'Weekly Progress';

  // Build non-weight metrics
  const metrics: { icon: React.ReactNode; label: string; value: string }[] = [];

  if (workoutsCompleted > 0) {
    metrics.push({
      icon: <Dumbbell className="w-4 h-4" style={{ color: primaryColor }} />,
      label: 'Workouts',
      value: `${workoutsCompleted} completed`
    });
  }

  if (avgCalories && avgCalories > 0) {
    metrics.push({
      icon: <Utensils className="w-4 h-4" style={{ color: primaryColor }} />,
      label: 'Avg Calories',
      value: `${Math.round(avgCalories).toLocaleString()}/day`
    });
  }

  if (avgProtein && avgProtein > 0) {
    metrics.push({
      icon: <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
        <span className="text-[8px] font-bold text-white">P</span>
      </div>,
      label: 'Avg Protein',
      value: `${Math.round(avgProtein)}g/day`
    });
  }

  if (avgDailySteps && avgDailySteps > 0) {
    metrics.push({
      icon: <Footprints className="w-4 h-4" style={{ color: primaryColor }} />,
      label: 'Avg Steps',
      value: `${avgDailySteps.toLocaleString()}/day`
    });
  }

  return (
    <div
      id="share-social-card"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
      className="flex flex-col rounded-2xl shadow-lg"
    >
      {/* Content */}
      <div className="flex flex-col flex-1 justify-between p-8">
        <div>
          {/* Header — matches summary card pattern */}
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
            {brand?.business_name && !brand?.logo_url && (
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{brand.business_name}</p>
            )}
            <h2 className="text-xl font-bold text-gray-900">{headline}</h2>
            <p className="text-sm text-gray-500">
              {clientName} · {formatDate(dateRangeStart)} - {formatDate(dateRangeEnd)}
            </p>
          </div>

          {/* Weight change section — matches summary card weight progress */}
          {weightChange !== undefined && weightChange !== 0 && (
            <div
              className="rounded-xl p-5 mb-5"
              style={{ background: `linear-gradient(to bottom right, ${primaryColor}10, ${accentColor}10)` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600">Weight Progress</span>
                {weightChange < 0 ? (
                  <TrendingDown className="w-6 h-6 text-green-500" />
                ) : (
                  <TrendingUp className="w-6 h-6 text-orange-500" />
                )}
              </div>

              <div className="flex items-end gap-3 mb-2">
                <span className={`text-4xl font-bold ${weightChange <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {convertWeight(weightChange) > 0 ? '+' : ''}{convertWeight(weightChange).toFixed(1)}
                </span>
                <span className="text-lg text-gray-500 mb-1">{weightUnit}</span>
              </div>

              {currentWeight !== undefined && currentWeight > 0 && (
                <div className="text-sm text-gray-600">
                  <span className="text-gray-400">Current:</span>{' '}
                  <span className="font-medium">{convertWeight(currentWeight).toFixed(1)} {weightUnit}</span>
                </div>
              )}
            </div>
          )}

          {/* Metrics grid — matches summary card stats grid */}
          {metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {metrics.map((metric, i) => (
                <div
                  key={i}
                  className="bg-gray-50 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {metric.icon}
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{metric.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — matches summary card footer */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              {brand?.footer_text && (
                <p className="text-xs text-gray-500 whitespace-pre-line leading-tight">{brand.footer_text}</p>
              )}
            </div>
            {(brand?.show_fitreport_badge !== false) && (
              <span className="text-xs text-gray-400">Powered by FitReport</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
