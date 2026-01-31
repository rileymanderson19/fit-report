'use client';

import React from 'react';
import { Dumbbell, Footprints, Utensils, TrendingDown, TrendingUp, CheckCircle } from 'lucide-react';

interface WeeklyData {
  workoutsCompleted: number;
  workoutsScheduled: number;
  avgDailySteps: number;
  stepsGoal: number;
  avgCalories: number;
  caloriesGoal?: number;
  avgProtein: number;
  proteinGoal?: number;
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
}

export default function ShareWeeklyHighlightsCard({
  clientName,
  dateRangeStart,
  dateRangeEnd,
  weeklyData,
  weightChange,
  isScreenshotMode = false,
  hideFooter = false,
  hideHeader = false
}: ShareWeeklyHighlightsCardProps) {
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
          <div className="h-1 w-16 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full mb-4" />
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
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4">
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
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(2)} lbs/wk
              </span>
            </div>
          </div>
        )}

        {/* Nutrition Row - Calories & Protein */}
        <div className="grid grid-cols-2 gap-3">
          {/* Calories */}
          {weeklyData.avgCalories > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Utensils className="w-4 h-4 text-purple-500" />
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
                <div className="w-4 h-4 rounded bg-purple-500 flex items-center justify-center">
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
        </div>

        {/* Steps */}
        {weeklyData.avgDailySteps > 0 && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-700">Daily Steps</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">
                  {weeklyData.avgDailySteps.toLocaleString()} avg
                </span>
                {getStatusIcon(stepsPercent)}
              </div>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(stepsPercent)} transition-all duration-300`}
                style={{ width: `${stepsPercent}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Goal: {weeklyData.stepsGoal.toLocaleString()} steps
            </div>
          </div>
        )}

        {/* Workouts */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">Workouts</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">
                {weeklyData.workoutsCompleted}
                {weeklyData.workoutsScheduled > 0 && ` / ${weeklyData.workoutsScheduled}`}
              </span>
              {getStatusIcon(workoutPercent)}
            </div>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(workoutPercent)} transition-all duration-300`}
              style={{ width: `${Math.min(workoutPercent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Branding Footer */}
      {!hideFooter && (
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center">
          <span className="text-xs text-gray-400">Powered by FitReport</span>
        </div>
      )}
    </div>
  );
}
