import React from 'react';
import { ProgressTracking } from './ProgressTracking';
import { TrainerNotes } from './TrainerNotes';

interface DailyData {
  date: string;
  weight: number;
  steps: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sleepHours: number;
  workouts?: any[];
}

interface WeeklyAverage {
  weekStart: string;
  weekEnd: string;
  avgWeight: number;
  avgSteps: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  avgSleepHours: number;
}

interface ReportInsightsProps {
  dailyData: DailyData[];
  weeklyAverages: WeeklyAverage[];
  clientName: string;
  isScreenshotMode?: boolean;
}

export function ReportInsights({ dailyData, weeklyAverages, clientName, isScreenshotMode = false }: ReportInsightsProps) {
  // Calculate insights
  const insights = React.useMemo(() => {
    if (dailyData.length === 0) return [];

    const insights: Array<{ type: 'positive' | 'neutral' | 'concern' | 'goal'; icon: string; message: string; priority: number }> = [];

    // Sleep Analysis
    const avgSleep = dailyData.reduce((sum, day) => sum + day.sleepHours, 0) / dailyData.length;
    const sleepConsistency = calculateConsistency(dailyData.map(d => d.sleepHours));
    
    if (avgSleep >= 7 && avgSleep <= 9) {
      insights.push({
        type: 'positive',
        icon: '😴',
        message: `Excellent sleep habits! Averaging ${avgSleep.toFixed(1)} hours per night - right in the optimal range.`,
        priority: 1
      });
    } else if (avgSleep < 6.5) {
      insights.push({
        type: 'concern',
        icon: '⚠️',
        message: `Sleep needs attention. Averaging only ${avgSleep.toFixed(1)} hours per night - below recommended 7-9 hours.`,
        priority: 3
      });
    }

    if (sleepConsistency < 0.8) {
      insights.push({
        type: 'neutral',
        icon: '📊',
        message: 'Sleep schedule is inconsistent. Consider establishing a regular bedtime routine.',
        priority: 2
      });
    }

    // Activity Analysis
    const avgSteps = dailyData.reduce((sum, day) => sum + day.steps, 0) / dailyData.length;
    const stepGoal = 10000;
    
    if (avgSteps >= stepGoal) {
      insights.push({
        type: 'positive',
        icon: '🚶',
        message: `Crushing the step goal! Averaging ${Math.round(avgSteps).toLocaleString()} steps daily.`,
        priority: 1
      });
    } else if (avgSteps < stepGoal * 0.7) {
      insights.push({
        type: 'concern',
        icon: '🎯',
        message: `Daily activity below target. Currently ${Math.round(avgSteps).toLocaleString()} steps vs ${stepGoal.toLocaleString()} goal.`,
        priority: 3
      });
    }

    // Nutrition Analysis
    const avgCalories = dailyData.reduce((sum, day) => sum + day.calories, 0) / dailyData.length;
    const avgProtein = dailyData.reduce((sum, day) => sum + day.protein, 0) / dailyData.length;
    const proteinPercentage = (avgProtein * 4) / avgCalories * 100; // 4 calories per gram of protein

    if (proteinPercentage >= 20 && proteinPercentage <= 35) {
      insights.push({
        type: 'positive',
        icon: '🥩',
        message: `Great protein intake! ${proteinPercentage.toFixed(0)}% of calories from protein.`,
        priority: 1
      });
    } else if (proteinPercentage < 15) {
      insights.push({
        type: 'concern',
        icon: '🥗',
        message: `Protein intake may be low at ${proteinPercentage.toFixed(0)}% of total calories. Consider adding more protein sources.`,
        priority: 2
      });
    }

    // Workout Consistency
    const workoutDays = dailyData.filter(day => day.workouts && day.workouts.length > 0).length;
    const workoutFrequency = workoutDays / dailyData.length;
    
    if (workoutFrequency >= 0.5) {
      insights.push({
        type: 'positive',
        icon: '💪',
        message: `Excellent training consistency! Working out ${workoutDays} out of ${dailyData.length} days.`,
        priority: 1
      });
    } else if (workoutFrequency < 0.3) {
      insights.push({
        type: 'neutral',
        icon: '📅',
        message: `Training frequency could improve. Consider adding 1-2 more workout days per week.`,
        priority: 2
      });
    }

    // Weight Trend Analysis
    if (weeklyAverages.length >= 2) {
      const weightChange = weeklyAverages[weeklyAverages.length - 1].avgWeight - weeklyAverages[0].avgWeight;
      if (Math.abs(weightChange) > 2) {
        const direction = weightChange > 0 ? 'gained' : 'lost';
        insights.push({
          type: weightChange > 0 ? 'neutral' : 'positive',
          icon: weightChange > 0 ? '📈' : '📉',
          message: `Significant weight change: ${direction} ${Math.abs(weightChange).toFixed(1)} lbs over the period.`,
          priority: 2
        });
      }
    }

    return insights.sort((a, b) => a.priority - b.priority);
  }, [dailyData, weeklyAverages]);

  // Calculate consistency (returns value between 0-1, where 1 is perfectly consistent)
  function calculateConsistency(values: number[]): number {
    if (values.length <= 1) return 1;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / mean;
    return Math.max(0, 1 - coefficientOfVariation);
  }

  // Generate recommendations
  const recommendations = React.useMemo(() => {
    const recs: string[] = [];
    
    // Sleep recommendations
    const avgSleep = dailyData.reduce((sum, day) => sum + day.sleepHours, 0) / dailyData.length;
    if (avgSleep < 7) {
      recs.push('Focus on improving sleep duration - aim for 7-9 hours nightly');
    }
    
    // Activity recommendations
    const avgSteps = dailyData.reduce((sum, day) => sum + day.steps, 0) / dailyData.length;
    if (avgSteps < 8000) {
      recs.push('Increase daily activity - try adding a 15-20 minute walk');
    }
    
    // Nutrition recommendations
    const avgProtein = dailyData.reduce((sum, day) => sum + day.protein, 0) / dailyData.length;
    const avgCalories = dailyData.reduce((sum, day) => sum + day.calories, 0) / dailyData.length;
    if ((avgProtein * 4) / avgCalories < 0.15) {
      recs.push('Consider adding a protein source to each meal');
    }
    
    // Workout recommendations
    const workoutDays = dailyData.filter(day => day.workouts && day.workouts.length > 0).length;
    if (workoutDays / dailyData.length < 0.4) {
      recs.push('Aim to increase training frequency by 1-2 sessions per week');
    }

    return recs;
  }, [dailyData]);

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            📋 Executive Summary for {clientName}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="p-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Sleep Quality</div>
              <div className="text-lg font-bold text-gray-900">
                {(() => {
                  const avgSleep = dailyData.reduce((sum, day) => sum + day.sleepHours, 0) / dailyData.length;
                  if (avgSleep >= 7.5) return '🟢 Excellent';
                  if (avgSleep >= 6.5) return '🟡 Good';
                  return '🔴 Needs Work';
                })()}
              </div>
            </div>
            <div className="p-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Activity Level</div>
              <div className="text-lg font-bold text-gray-900">
                {(() => {
                  const avgSteps = dailyData.reduce((sum, day) => sum + day.steps, 0) / dailyData.length;
                  if (avgSteps >= 10000) return '🟢 Active';
                  if (avgSteps >= 7000) return '🟡 Moderate';
                  return '🔴 Low';
                })()}
              </div>
            </div>
            <div className="p-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Training</div>
              <div className="text-lg font-bold text-gray-900">
                {(() => {
                  const workoutDays = dailyData.filter(day => day.workouts && day.workouts.length > 0).length;
                  const frequency = workoutDays / dailyData.length;
                  if (frequency >= 0.5) return '🟢 Consistent';
                  if (frequency >= 0.3) return '🟡 Regular';
                  return '🔴 Sporadic';
                })()}
              </div>
            </div>
            <div className="p-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Nutrition</div>
              <div className="text-lg font-bold text-gray-900">
                {(() => {
                  const avgProtein = dailyData.reduce((sum, day) => sum + day.protein, 0) / dailyData.length;
                  const avgCalories = dailyData.reduce((sum, day) => sum + day.calories, 0) / dailyData.length;
                  const proteinRatio = (avgProtein * 4) / avgCalories;
                  if (proteinRatio >= 0.2) return '🟢 Balanced';
                  if (proteinRatio >= 0.15) return '🟡 Fair';
                  return '🔴 Low Protein';
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            🔍 Key Insights
          </h3>
          <div className="space-y-3 mt-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`rounded-xl p-4 flex items-center gap-3 ${
                  insight.type === 'positive' ? 'bg-green-50 border border-green-200' :
                  insight.type === 'concern' ? 'bg-yellow-50 border border-yellow-200' :
                  insight.type === 'goal' ? 'bg-blue-50 border border-blue-200' :
                  'bg-blue-50 border border-blue-200'
                }`}
              >
                <span className="text-lg">{insight.icon}</span>
                <span>{insight.message}</span>
              </div>
            ))}
            {insights.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No specific insights to highlight for this period.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Items */}
      {recommendations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              🎯 Recommended Action Items
            </h3>
            <ul className="space-y-2 mt-4">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Progress Tracking Dashboard */}
      <ProgressTracking 
        dailyData={dailyData}
        weeklyAverages={weeklyAverages}
      />

      {/* Trainer Notes & AI Coaching */}
      <TrainerNotes 
        dailyData={dailyData}
        weeklyAverages={weeklyAverages}
        clientName={clientName}
        isScreenshotMode={isScreenshotMode}
      />
    </div>
  );
} 