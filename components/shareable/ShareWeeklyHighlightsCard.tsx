'use client';

import React from 'react';
import { Dumbbell, Footprints, Utensils, TrendingDown, TrendingUp, CheckCircle } from 'lucide-react';
import { BrandConfig } from '@/hooks/useBrandConfig';

interface WeeklyData {
  workoutsCompleted: number;
  workoutsScheduled: number;
  avgDailySteps: number;
  stepsGoal: number;
  avgCalories: number;
  caloriesGoal?: number;
  avgProtein: number;
  proteinGoal?: number;
  avgCarbs?: number;
  avgFats?: number;
}

interface ShareWeeklyHighlightsCardProps {
  clientName: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  weeklyData: WeeklyData;
  weightChange?: number;  // Total weight change over period
  isScreenshotMode?: boolean;
  hideFooter?: boolean;
  hideHeader?: boolean;
  unitPreference?: 'lbs' | 'kg';
  brand?: BrandConfig | null;
}

export default function ShareWeeklyHighlightsCard({
  clientName,
  dateRangeStart,
  dateRangeEnd,
  weeklyData,
  weightChange,
  isScreenshotMode = false,
  hideFooter = false,
  hideHeader = false,
  unitPreference = 'lbs',
  brand
}: ShareWeeklyHighlightsCardProps) {
  const primaryColor = brand?.primary_color || '#2563EB';
  // Unit conversion helpers
  const convertWeight = (lbs: number): number => unitPreference === 'kg' ? lbs * 0.453592 : lbs;
  const weightUnit = unitPreference === 'kg' ? 'kg' : 'lbs';
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate percentages for progress bars
  const workoutPercent = weeklyData.workoutsScheduled > 0
    ? (weeklyData.workoutsCompleted / weeklyData.workoutsScheduled) * 100
    : weeklyData.workoutsCompleted > 0 ? 100 : 0;

  const stepsPercent = Math.min((weeklyData.avgDailySteps / weeklyData.stepsGoal) * 100, 100);

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'bg-green-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getStatusIcon = (percent: number) => {
    if (percent >= 90) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return null;
  };

  return (
    <div
      id="share-weekly-highlights"
      className={`bg-white overflow-hidden ${hideHeader ? 'rounded-xl' : 'rounded-2xl shadow-lg'} ${isScreenshotMode ? 'p-8' : 'p-6'}`}
      style={{ width: hideHeader ? '100%' : (isScreenshotMode ? '400px' : '100%'), maxWidth: hideHeader ? 'none' : '400px' }}
    >
      {/* Header */}
      {!hideHeader && (
        <div className="mb-6">
          <div className="h-1 w-16 rounded-full mb-4" style={{ background: `linear-gradient(to right, ${primaryColor}, ${brand?.accent_color || '#1D4ED8'})` }} />
          <h2 className="text-xl font-bold text-gray-900">Weekly Highlights</h2>
          <p className="text-sm text-gray-500">
            {formatDate(dateRangeStart)} - {formatDate(dateRangeEnd)}
          </p>
        </div>
      )}

      {/* Metrics Grid - Order: Weight Change, Calories, Protein, Steps, Workouts */}
      <div className="space-y-4">
        {/* Weight Change per Week */}
        {weightChange !== undefined && weightChange !== 0 && (
          <div className="rounded-xl p-4" style={{ background: `linear-gradient(to bottom right, ${primaryColor}10, ${brand?.accent_color || '#1D4ED8'}10)` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {weightChange < 0 ? (
                  <TrendingDown className="w-5 h-5 text-green-500" />
                ) : weightChange > 0 ? (
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                ) : null}
                <span className="text-sm font-medium text-gray-700">Avg Weight Change</span>
              </div>
              <span className={`text-xl font-bold ${weightChange <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                {weightChange > 0 ? '+' : ''}{convertWeight(weightChange).toFixed(2)} {weightUnit}/wk
              </span>
            </div>
          </div>
        )}

        {/* Metrics Grid - Calories, Protein, Carbs, Fats, Steps, Workouts */}
        <div className="grid grid-cols-2 gap-3">
          {/* Calories */}
          {weeklyData.avgCalories > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Utensils className="w-4 h-4" style={{ color: primaryColor }} />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Calories</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {Math.round(weeklyData.avgCalories).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">daily avg</div>
            </div>
          )}

          {/* Protein */}
          {weeklyData.avgProtein > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                  <span className="text-[10px] font-bold text-white">P</span>
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Protein</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {Math.round(weeklyData.avgProtein)}g
              </div>
              <div className="text-xs text-gray-500">daily avg</div>
            </div>
          )}

          {/* Carbs */}
          {weeklyData.avgCarbs && weeklyData.avgCarbs > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded bg-yellow-500 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">C</span>
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Carbs</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {Math.round(weeklyData.avgCarbs)}g
              </div>
              <div className="text-xs text-gray-500">daily avg</div>
            </div>
          )}

          {/* Fats */}
          {weeklyData.avgFats && weeklyData.avgFats > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 rounded bg-amber-500 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">F</span>
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fats</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {Math.round(weeklyData.avgFats)}g
              </div>
              <div className="text-xs text-gray-500">daily avg</div>
            </div>
          )}

          {/* Steps */}
          {weeklyData.avgDailySteps > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Footprints className="w-4 h-4" style={{ color: primaryColor }} />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Steps</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {weeklyData.avgDailySteps.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">daily avg</div>
            </div>
          )}

          {/* Workouts */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="w-4 h-4" style={{ color: primaryColor }} />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Workouts</span>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {weeklyData.workoutsCompleted}
            </div>
            <div className="text-xs text-gray-500">completed</div>
          </div>
        </div>
      </div>

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
