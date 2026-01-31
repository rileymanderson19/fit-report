'use client';

import React from 'react';
import { Dumbbell, Footprints, Utensils, Moon, Star, CheckCircle } from 'lucide-react';

interface WeeklyData {
  workoutsCompleted: number;
  workoutsScheduled: number;
  avgDailySteps: number;
  stepsGoal: number;
  avgCalories: number;
  caloriesGoal?: number;
  avgProtein: number;
  proteinGoal?: number;
  avgSleep: number;
  sleepGoal?: number;
  bestDay?: {
    date: string;
    highlights: string[];
  };
}

interface ShareWeeklyHighlightsCardProps {
  clientName: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  weeklyData: WeeklyData;
  isScreenshotMode?: boolean;
}

export default function ShareWeeklyHighlightsCard({
  clientName,
  dateRangeStart,
  dateRangeEnd,
  weeklyData,
  isScreenshotMode = false
}: ShareWeeklyHighlightsCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatBestDayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Calculate percentages for progress bars
  const workoutPercent = weeklyData.workoutsScheduled > 0
    ? (weeklyData.workoutsCompleted / weeklyData.workoutsScheduled) * 100
    : weeklyData.workoutsCompleted > 0 ? 100 : 0;

  const stepsPercent = Math.min((weeklyData.avgDailySteps / weeklyData.stepsGoal) * 100, 100);

  const proteinPercent = weeklyData.proteinGoal
    ? Math.min((weeklyData.avgProtein / weeklyData.proteinGoal) * 100, 100)
    : weeklyData.avgProtein >= 100 ? 100 : (weeklyData.avgProtein / 100) * 100;

  const sleepPercent = weeklyData.sleepGoal
    ? Math.min((weeklyData.avgSleep / weeklyData.sleepGoal) * 100, 100)
    : weeklyData.avgSleep >= 7.5 ? 100 : (weeklyData.avgSleep / 7.5) * 100;

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
      className={`bg-white rounded-2xl shadow-lg overflow-hidden ${isScreenshotMode ? 'p-8' : 'p-6'}`}
      style={{ width: isScreenshotMode ? '400px' : '100%', maxWidth: '400px' }}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="h-1 w-16 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Weekly Highlights</h2>
        <p className="text-sm text-gray-500">
          {formatDate(dateRangeStart)} - {formatDate(dateRangeEnd)}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="space-y-4">
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

        {/* Nutrition Row */}
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

        {/* Sleep */}
        {weeklyData.avgSleep > 0 && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-700">Sleep</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">
                  {weeklyData.avgSleep.toFixed(1)} hrs avg
                </span>
                {getStatusIcon(sleepPercent)}
              </div>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getProgressColor(sleepPercent)} transition-all duration-300`}
                style={{ width: `${sleepPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Best Day Highlight */}
      {weeklyData.bestDay && weeklyData.bestDay.highlights.length > 0 && (
        <div className="mt-5 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium text-gray-700">Best Day</span>
          </div>
          <div className="text-sm font-semibold text-purple-700 mb-1">
            {formatBestDayDate(weeklyData.bestDay.date)}
          </div>
          <div className="flex flex-wrap gap-2">
            {weeklyData.bestDay.highlights.map((highlight, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-white text-gray-700 border border-purple-100"
              >
                {highlight}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Branding Footer */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center">
        <span className="text-xs text-gray-400">Powered by FitReport</span>
      </div>
    </div>
  );
}
