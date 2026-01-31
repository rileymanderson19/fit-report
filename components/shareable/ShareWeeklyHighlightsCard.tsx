'use client';

import React from 'react';
import { Dumbbell, Footprints, Utensils, Moon, TrendingUp, TrendingDown, Minus, CheckCircle } from 'lucide-react';

interface WeekOverWeekChanges {
  steps?: number;      // Change in daily avg steps
  weight?: number;     // Change in weight (lbs)
  protein?: number;    // Change in daily avg protein (g)
  sleep?: number;      // Change in avg sleep (hrs)
}

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
  weekOverWeek?: WeekOverWeekChanges;
}

interface ShareWeeklyHighlightsCardProps {
  clientName: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  weeklyData: WeeklyData;
  isScreenshotMode?: boolean;
  hideFooter?: boolean;
  hideHeader?: boolean;
  hideWeightInWoW?: boolean;
}

export default function ShareWeeklyHighlightsCard({
  clientName,
  dateRangeStart,
  dateRangeEnd,
  weeklyData,
  isScreenshotMode = false,
  hideFooter = false,
  hideHeader = false,
  hideWeightInWoW = false
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

      {/* Week-over-Week Changes */}
      {weeklyData.weekOverWeek && (
        <div className="mt-5 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">Week-over-Week</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {!hideWeightInWoW && weeklyData.weekOverWeek.weight !== undefined && weeklyData.weekOverWeek.weight !== 0 && (
              <div className="flex items-center gap-2">
                {weeklyData.weekOverWeek.weight < 0 ? (
                  <TrendingDown className="w-3 h-3 text-green-500" />
                ) : weeklyData.weekOverWeek.weight > 0 ? (
                  <TrendingUp className="w-3 h-3 text-orange-500" />
                ) : (
                  <Minus className="w-3 h-3 text-gray-400" />
                )}
                <span className={`text-sm font-medium ${weeklyData.weekOverWeek.weight <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {weeklyData.weekOverWeek.weight > 0 ? '+' : ''}{weeklyData.weekOverWeek.weight.toFixed(1)} lbs
                </span>
              </div>
            )}
            {weeklyData.weekOverWeek.steps !== undefined && weeklyData.weekOverWeek.steps !== 0 && (
              <div className="flex items-center gap-2">
                {weeklyData.weekOverWeek.steps > 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : weeklyData.weekOverWeek.steps < 0 ? (
                  <TrendingDown className="w-3 h-3 text-orange-500" />
                ) : (
                  <Minus className="w-3 h-3 text-gray-400" />
                )}
                <span className={`text-sm font-medium ${weeklyData.weekOverWeek.steps >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {weeklyData.weekOverWeek.steps > 0 ? '+' : ''}{weeklyData.weekOverWeek.steps.toLocaleString()} steps
                </span>
              </div>
            )}
            {weeklyData.weekOverWeek.protein !== undefined && weeklyData.weekOverWeek.protein !== 0 && (
              <div className="flex items-center gap-2">
                {weeklyData.weekOverWeek.protein > 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : weeklyData.weekOverWeek.protein < 0 ? (
                  <TrendingDown className="w-3 h-3 text-orange-500" />
                ) : (
                  <Minus className="w-3 h-3 text-gray-400" />
                )}
                <span className={`text-sm font-medium ${weeklyData.weekOverWeek.protein >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {weeklyData.weekOverWeek.protein > 0 ? '+' : ''}{Math.round(weeklyData.weekOverWeek.protein)}g protein
                </span>
              </div>
            )}
            {weeklyData.weekOverWeek.sleep !== undefined && weeklyData.weekOverWeek.sleep !== 0 && (
              <div className="flex items-center gap-2">
                {weeklyData.weekOverWeek.sleep > 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-500" />
                ) : weeklyData.weekOverWeek.sleep < 0 ? (
                  <TrendingDown className="w-3 h-3 text-orange-500" />
                ) : (
                  <Minus className="w-3 h-3 text-gray-400" />
                )}
                <span className={`text-sm font-medium ${weeklyData.weekOverWeek.sleep >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {weeklyData.weekOverWeek.sleep > 0 ? '+' : ''}{weeklyData.weekOverWeek.sleep.toFixed(1)} hrs sleep
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Branding Footer */}
      {!hideFooter && (
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center">
          <span className="text-xs text-gray-400">Powered by FitReport</span>
        </div>
      )}
    </div>
  );
}
