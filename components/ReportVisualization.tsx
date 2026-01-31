'use client';

import { useMemo, useState } from 'react';
import { ExerciseNotes } from './ExerciseNotes';
import { EnhancedAnalytics } from './EnhancedAnalytics';

interface WorkoutExercise {
  name: string;
  sets?: number;
  stats?: {
    reps?: number;
    weight?: number;
    time?: number;
    distance?: number;
  }[];
  notes?: string;
}

interface Workout {
  id: number;
  title: string;
  date: string;
  duration?: number;
  exercises?: WorkoutExercise[];
}

interface DailyData {
  date: string;
  weight: number;
  steps: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sleepHours: number;
  workouts?: Workout[];
}

interface ReportVisualizationProps {
  data: {
    bodyStats: {
      bodyStats: Array<{
        date: string;
        weight: number;
      }>;
    };
    healthData: {
      healthData: Array<{
        date: string;
        data: {
          steps: number;
        };
      }>;
    };
    nutritionData: {
      nutrition: Array<{
        date: string;
        calories: number;
        proteinGrams: number;
        carbsGrams: number;
        fatGrams: number;
      }>;
    };
    sleepData?: {
      isTracked: boolean;
      sleep?: Array<{
        id: number;
        userID: number;
        source: string;
        startTime: string;
        endTime: string;
        type: string;
      }>;
    };
    workoutData: {
      workouts: Workout[];
    };
    template?: 'daily' | 'weekly' | 'enhanced';
  };
  onDeleteWorkout?: (workoutId: number) => void;
  onDeleteExercise?: (workoutId: number, exerciseName: string) => void;
  isScreenshotMode?: boolean;
  forceTemplate?: 'daily' | 'weekly' | 'enhanced';
  clientName?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  last7ReportData?: any; // Last 7 days report data for calendar view
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

export function ReportVisualization({ 
  data, 
  onDeleteWorkout, 
  onDeleteExercise,
  isScreenshotMode = false,
  forceTemplate,
  clientName = "Client",
  dateRangeStart,
  last7ReportData
}: ReportVisualizationProps) {
  // Weight unit toggle state
  const [useMetric, setUseMetric] = useState(false);
  
  // Weight conversion utilities
  const convertWeight = (weightLbs: number): number => {
    return useMetric ? weightLbs * 0.453592 : weightLbs; // Convert lbs to kg if metric
  };
  
  const formatWeight = (weightLbs: number): string => {
    const convertedWeight = convertWeight(weightLbs);
    if (useMetric) {
      return Math.round(convertedWeight).toString();
    } else {
      // For lbs, show whole numbers without decimals, otherwise show 1 decimal
      return convertedWeight % 1 === 0 ? convertedWeight.toString() : formatNumber(convertedWeight, 1);
    }
  };
  
  const getWeightUnit = (): string => {
    return useMetric ? 'kg' : 'lbs';
  };

  // Process all data into a single daily format
  const processedDailyData = useMemo(() => {
    const dailyData = new Map<string, DailyData>();
    
    // Process body stats
    data.bodyStats?.bodyStats?.forEach(item => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          weight: item.weight || 0,
          steps: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          sleepHours: 0,
          workouts: []
        });
      } else {
        dailyData.get(date)!.weight = item.weight || 0;
      }
    });

    // Process health data
    data.healthData?.healthData?.forEach(item => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          weight: 0,
          steps: item.data?.steps || 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          sleepHours: 0,
          workouts: []
        });
      } else {
        dailyData.get(date)!.steps = item.data?.steps || 0;
      }
    });

    // Process nutrition data
    data.nutritionData?.nutrition?.forEach(item => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          weight: 0,
          steps: 0,
          calories: item.calories || 0,
          protein: item.proteinGrams || 0,
          carbs: item.carbsGrams || 0,
          fats: item.fatGrams || 0,
          sleepHours: 0,
          workouts: []
        });
      } else {
        const entry = dailyData.get(date)!;
        entry.calories = item.calories || 0;
        entry.protein = item.proteinGrams || 0;
        entry.carbs = item.carbsGrams || 0;
        entry.fats = item.fatGrams || 0;
      }
    });

    // Process sleep data
    data.sleepData?.sleep?.forEach(sleepRecord => {
      const startTime = new Date(sleepRecord.startTime);
      const endTime = new Date(sleepRecord.endTime);
      
      // Calculate sleep duration in hours
      const durationMs = endTime.getTime() - startTime.getTime();
      const sleepHours = durationMs / (1000 * 60 * 60); // Convert to hours
      
      // Use the end date (when they woke up) as the date for this sleep session
      const date = endTime.toISOString().split('T')[0];
      

      
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          weight: 0,
          steps: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          sleepHours: sleepHours,
          workouts: []
        });
      } else {
        const entry = dailyData.get(date)!;
        // Add to existing sleep hours instead of overwriting (multiple sleep segments per night)
        entry.sleepHours += sleepHours;
      }
    });

    // Process workout data
    data.workoutData?.workouts?.forEach(workout => {
      const date = new Date(workout.date).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          weight: 0,
          steps: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          sleepHours: 0,
          workouts: [workout]
        });
      } else {
        const entry = dailyData.get(date)!;
        if (!entry.workouts) {
          entry.workouts = [];
        }
        entry.workouts.push(workout);
      }
    });

    return Array.from(dailyData.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [
    data.bodyStats?.bodyStats,
    data.healthData?.healthData,
    data.nutritionData?.nutrition,
    data.sleepData?.sleep,
    data.workoutData?.workouts,
  ]);

  // Helper function to calculate averages only for days with data
  const calculateAverage = (data: DailyData[], metric: keyof DailyData): number => {
    const validData = data.filter(day => {
      const value = day[metric];
      return typeof value === 'number' && value > 0;
    });
    if (validData.length === 0) return 0;
    const sum = validData.reduce((acc, day) => acc + (day[metric] as number), 0);
    return sum / validData.length;
  };

  // Calculate if this is a single week or multiple weeks
  const timeSpanInfo = useMemo(() => {
    if (processedDailyData.length === 0) return { isSingleWeek: true, numberOfWeeks: 0 };
    
    const firstDate = new Date(processedDailyData[0].date);
    const lastDate = new Date(processedDailyData[processedDailyData.length - 1].date);
    const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      isSingleWeek: daysDiff <= 7,
      numberOfWeeks: Math.ceil(daysDiff / 7)
    };
  }, [processedDailyData]);

  // Calculate weekly averages
  const weeklyAverages = useMemo(() => {
    if (processedDailyData.length === 0) return [];

    // Use dateRangeStart as the starting point for weekly boundaries, fallback to first data point
    const rangeStart = dateRangeStart 
      ? new Date(dateRangeStart.split('T')[0])
      : new Date(processedDailyData[0].date);

    const weeks: WeeklyAverage[] = [];
    let currentWeekStart = new Date(rangeStart);
    let weekNumber = 1;

    // Generate weeks based on the date range, not data availability
    const lastDataDate = new Date(processedDailyData[processedDailyData.length - 1].date);
    
    while (currentWeekStart <= lastDataDate && weekNumber <= 10) {
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

      // Collect data for this week
      const currentWeekData = processedDailyData.filter(dayData => {
        const dataDate = new Date(dayData.date);
        return dataDate >= currentWeekStart && dataDate <= currentWeekEnd;
      });

      // Only add the week if it has any data or if it's within our expected range
      if (currentWeekData.length > 0) {
        weeks.push({
          weekStart: currentWeekStart.toISOString().split('T')[0],
          weekEnd: currentWeekEnd.toISOString().split('T')[0],
          avgWeight: calculateAverage(currentWeekData, 'weight'),
          avgSteps: calculateAverage(currentWeekData, 'steps'),
          avgCalories: calculateAverage(currentWeekData, 'calories'),
          avgProtein: calculateAverage(currentWeekData, 'protein'),
          avgCarbs: calculateAverage(currentWeekData, 'carbs'),
          avgFats: calculateAverage(currentWeekData, 'fats'),
          avgSleepHours: calculateAverage(currentWeekData, 'sleepHours'),
        });
      }

      // Move to next week
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      weekNumber++;
    }

    return weeks;
  }, [processedDailyData, dateRangeStart]);



  const formatDate = (dateStr: string) => {
    // Parse the date string in local timezone to match data processing
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatNumber = (num: number, decimals: number = 1) => {
    return num.toFixed(decimals);
  };

  // Create a stable analytics dataset used by EnhancedAnalytics
  const analyticsData = useMemo(() => {
    // This creates a completely independent snapshot for consistency analysis
    const dailyData = new Map<string, DailyData>();
    
    // Process body stats
    data.bodyStats?.bodyStats?.forEach(item => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          weight: item.weight || 0,
          steps: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          sleepHours: 0,
          workouts: []
        });
      } else {
        dailyData.get(date)!.weight = item.weight || 0;
      }
    });

    // Process health data
    data.healthData?.healthData?.forEach(item => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          weight: 0,
          steps: item.data?.steps || 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          sleepHours: 0,
          workouts: []
        });
      } else {
        dailyData.get(date)!.steps = item.data?.steps || 0;
      }
    });

    // Process nutrition data
    data.nutritionData?.nutrition?.forEach(item => {
      const date = new Date(item.date).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          weight: 0,
          steps: 0,
          calories: item.calories || 0,
          protein: item.proteinGrams || 0,
          carbs: item.carbsGrams || 0,
          fats: item.fatGrams || 0,
          sleepHours: 0,
          workouts: []
        });
      } else {
        const entry = dailyData.get(date)!;
        entry.calories = item.calories || 0;
        entry.protein = item.proteinGrams || 0;
        entry.carbs = item.carbsGrams || 0;
        entry.fats = item.fatGrams || 0;
      }
    });

    // Process sleep data
    data.sleepData?.sleep?.forEach(sleepRecord => {
      const startTime = new Date(sleepRecord.startTime);
      const endTime = new Date(sleepRecord.endTime);
      
      // Calculate sleep duration in hours
      const durationMs = endTime.getTime() - startTime.getTime();
      const sleepHours = durationMs / (1000 * 60 * 60); // Convert to hours
      
      // Use the end date (when they woke up) as the date for this sleep session
      const date = endTime.toISOString().split('T')[0];
      
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          weight: 0,
          steps: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          sleepHours: sleepHours,
          workouts: []
        });
      } else {
        const entry = dailyData.get(date)!;
        // Add to existing sleep hours instead of overwriting (multiple sleep segments per night)
        entry.sleepHours += sleepHours;
      }
    });

    // Process workout data - create deep copies so they can never be modified
    data.workoutData?.workouts?.forEach(workout => {
      const date = new Date(workout.date).toISOString().split('T')[0];
      const workoutCopy = {
        ...workout,
        exercises: workout.exercises ? workout.exercises.map(exercise => ({
          ...exercise,
          stats: exercise.stats ? exercise.stats.map(stat => ({ ...stat })) : []
        })) : []
      };
      
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          weight: 0,
          steps: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
          sleepHours: 0,
          workouts: [workoutCopy]
        });
      } else {
        const entry = dailyData.get(date)!;
        if (!entry.workouts) {
          entry.workouts = [];
        }
        entry.workouts.push(workoutCopy);
      }
    });

    return Array.from(dailyData.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [
    data.bodyStats?.bodyStats,
    data.healthData?.healthData,
    data.nutritionData?.nutrition,
    data.sleepData?.sleep,
    data.workoutData?.workouts,
  ]);

  // Create weekly averages specifically for analytics (based on unmodified data)
  const analyticsWeeklyAverages = useMemo(() => {
    if (analyticsData.length === 0) return [];

    // Use dateRangeStart as the starting point for weekly boundaries, fallback to first data point
    const rangeStart = dateRangeStart 
      ? new Date(dateRangeStart.split('T')[0])
      : new Date(analyticsData[0].date);

    const weeks: WeeklyAverage[] = [];
    let currentWeekStart = new Date(rangeStart);
    let weekNumber = 1;
    
    // Generate weeks based on the date range, not data availability
    const lastDataDate = new Date(analyticsData[analyticsData.length - 1].date);
    
    while (currentWeekStart <= lastDataDate && weekNumber <= 10) {
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

      // Collect data for this week
      const currentWeekData = analyticsData.filter(dayData => {
        const dataDate = new Date(dayData.date);
        return dataDate >= currentWeekStart && dataDate <= currentWeekEnd;
      });

      // Only add the week if it has any data
      if (currentWeekData.length > 0) {
        weeks.push({
          weekStart: currentWeekStart.toISOString().split('T')[0],
          weekEnd: currentWeekEnd.toISOString().split('T')[0],
          avgWeight: calculateAverage(currentWeekData, 'weight'),
          avgSteps: calculateAverage(currentWeekData, 'steps'),
          avgCalories: calculateAverage(currentWeekData, 'calories'),
          avgProtein: calculateAverage(currentWeekData, 'protein'),
          avgCarbs: calculateAverage(currentWeekData, 'carbs'),
          avgFats: calculateAverage(currentWeekData, 'fats'),
          avgSleepHours: calculateAverage(currentWeekData, 'sleepHours'),
        });
      }

      // Move to next week
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      weekNumber++;
    }

    return weeks;
  }, [analyticsData, dateRangeStart]);

  if (processedDailyData.length === 0) {
    return (
      <div className="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>No data available for this period</span>
      </div>
    );
  }

  // Determine which template to use
  const isEnhancedTemplate = forceTemplate === 'enhanced' || data.template === 'enhanced';
  const shouldUseDailyTemplate = forceTemplate 
    ? (forceTemplate === 'daily')
    : (data.template === 'daily'
        ? true 
        : data.template === 'weekly' || data.template === 'enhanced' ? false : timeSpanInfo.isSingleWeek);

  return (
    <div className="space-y-8">
      {/* Enhanced Analytics Section - Only for Enhanced Template */}
      {isEnhancedTemplate && (
        <EnhancedAnalytics 
          dailyData={analyticsData}
          weeklyAverages={analyticsWeeklyAverages}
          clientName={clientName}
          last7ReportData={last7ReportData}
        />
      )}
      
      {/* Weight Unit Toggle */}
      {!isScreenshotMode && (
        <div className="flex justify-end">
          <div className="form-control">
            <label className="label cursor-pointer gap-3">
              <span className="label-text font-medium">Weight Unit:</span>
              <span className="label-text">{useMetric ? 'kg' : 'lbs'}</span>
              <input 
                type="checkbox" 
                className="toggle toggle-primary" 
                checked={useMetric}
                onChange={(e) => setUseMetric(e.target.checked)}
              />
              <span className="label-text">{useMetric ? 'lbs' : 'kg'}</span>
            </label>
          </div>
        </div>
      )}
      
      {shouldUseDailyTemplate ? (
        // Single Week View
        <div className="space-y-6">
          {/* Metrics Table */}
          <div className="overflow-x-auto">
            <h3 className="text-xl font-semibold mb-4">Daily Metrics</h3>
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Weight ({getWeightUnit()})</th>
                  <th>Steps</th>
                  <th>Calories</th>
                  <th>Protein (g)</th>
                  <th>Carbs (g)</th>
                  <th>Fats (g)</th>
                  <th>Sleep (hrs)</th>
                </tr>
              </thead>
              <tbody>
                {processedDailyData.map((day) => (
                  <tr key={day.date}>
                    <td>{formatDate(day.date)}</td>
                    <td>{formatWeight(day.weight)}</td>
                    <td>{formatNumber(day.steps, 0)}</td>
                    <td>{formatNumber(day.calories, 0)}</td>
                    <td>{formatNumber(day.protein)}</td>
                    <td>{formatNumber(day.carbs)}</td>
                    <td>{formatNumber(day.fats)}</td>
                    <td>{formatNumber(day.sleepHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Workouts Section */}
          <div>
            <h3 className="text-xl font-semibold mb-6">Daily Workouts</h3>
            <div className="space-y-4">
              {processedDailyData
                .filter(day => day.workouts && day.workouts.length > 0)
                .map((day) => (
                  <div key={day.date} className="card bg-base-200">
                    <div className="card-body p-6">
                      <h4 className="card-title text-lg mb-6">{formatDate(day.date)}</h4>
                      {day.workouts!.map((workout) => (
                        <div key={workout.id} className="mb-4 last:mb-0">
                          <div className="flex items-center justify-between mb-6">
                            <h5 className="text-lg font-medium">{workout.title}</h5>
                            {!isScreenshotMode && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => onDeleteWorkout?.(workout.id)}
                                  className="btn btn-sm btn-ghost text-error"
                                  title={`Delete workout from ${formatDate(workout.date)}`}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                          {workout.exercises && workout.exercises.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="table w-full">
                                <thead>
                                  <tr className="border-b-2 border-base-300">
                                    <th className="py-4 px-6 text-left font-semibold text-base w-1/4">Exercise</th>
                                    <th className="py-4 px-6 text-right font-semibold text-base w-[200px] whitespace-nowrap">Sets</th>
                                    <th className="py-4 px-6 text-left font-semibold text-base min-w-[300px]">Trainer Notes</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-base-300">
                                  {workout.exercises
                                    .filter(exercise => 
                                      !exercise.name.toLowerCase().includes('walking') &&
                                      !exercise.name.toLowerCase().includes('walk')
                                    )
                                    .map((exercise, idx) => (
                                      <tr key={idx} className="hover:bg-base-200/50">
                                        <td className="py-4 px-6">
                                          <div className="flex items-center gap-3">
                                            <span className="text-primary font-medium">{exercise.name}</span>
                                            {!isScreenshotMode && (
                                              <button
                                                onClick={() => {
                                                  processedDailyData.forEach(day => {
                                                    day.workouts = day.workouts?.filter(w => w.id !== workout.id) || [];
                                                  });
                                                  onDeleteWorkout?.(workout.id);
                                                }}
                                                className="btn btn-xs btn-ghost text-error"
                                                title="Delete exercise from all workouts"
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                          <div className="flex flex-col items-end gap-1.5">
                                          {exercise.stats?.map((stat, groupIdx) => (
                                              <div key={groupIdx} className="font-medium whitespace-nowrap">
                                                {stat.reps} × {stat.weight ? formatWeight(stat.weight) : stat.weight}
                                                <span className="text-sm ml-1 text-base-content/80">{getWeightUnit()}</span>
                                              </div>
                                          ))}
                                          </div>
                                        </td>
                                        <td className="py-4 px-6">
                                          <ExerciseNotes
                                            exerciseId={idx}
                                            initialNotes={exercise.notes}
                                            onSave={() => {}}
                                          />
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              {!processedDailyData.some(day => day.workouts && day.workouts.length > 0) && (
                <div className="text-center py-4 text-base-content/60">
                  No workouts recorded during this period
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Multi-Week View
        <div className="space-y-8">

          {/* Weekly Workout Summary */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Weekly Workout Summary</h3>
            <div className="space-y-6">
              {/* Group all workouts by title across all weeks */}
              {(() => {
                // Get all workouts from all weeks
                const allWorkouts = weeklyAverages.flatMap(week => {
                  const weekStart = new Date(week.weekStart);
                  const weekEnd = new Date(week.weekEnd);
                  return processedDailyData
                    .filter(day => {
                      const date = new Date(day.date);
                      return date >= weekStart && date <= weekEnd && day.workouts && day.workouts.length > 0;
                    })
                    .flatMap(day => day.workouts || []);
                });

                // Group workouts by title
                const workoutGroups = allWorkouts.reduce((groups, workout) => {
                  if (!groups[workout.title]) {
                    groups[workout.title] = [];
                  }
                  groups[workout.title].push(workout);
                  return groups;
                }, {} as Record<string, Workout[]>);

                return Object.entries(workoutGroups).map(([title, workouts]) => {
                  // Sort workouts by date and limit to 2 most recent
                  const sortedWorkouts = [...workouts]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 2);

                  return (
                    <div key={title} className="card bg-base-200/50 mb-6">
                      <div className="card-body">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="card-title text-xl">{title}</h4>
                          {!isScreenshotMode && (
                            <button
                              onClick={() => {
                                // Delete all workouts with this title
                                sortedWorkouts.forEach(workout => {
                                  onDeleteWorkout?.(workout.id);
                                });
                              }}
                              className="btn btn-sm btn-ghost text-error"
                              title={`Delete all "${title}" workouts`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              Delete All
                            </button>
                          )}
                        </div>
                        {sortedWorkouts[0].exercises && sortedWorkouts[0].exercises.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="table w-full">
                              <thead>
                                <tr className="border-b border-base-300">
                                  <th className="py-6 px-6 text-left font-semibold text-base w-1/4">Exercise</th>
                                  {[...sortedWorkouts].reverse().map(workout => (
                                    <th key={workout.id} className="py-6 px-6 text-right font-semibold text-base w-[200px] whitespace-nowrap">
                                      Sets ({formatDate(workout.date)})
                                    </th>
                                  ))}
                                  <th className="py-6 px-6 text-left font-semibold text-base min-w-[300px]">Trainer Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-base-300">
                                {sortedWorkouts[0].exercises
                                  .filter(exercise => 
                                    !exercise.name.toLowerCase().includes('walking') &&
                                    !exercise.name.toLowerCase().includes('walk')
                                  )
                                  .map((exercise, idx) => (
                                    <tr key={idx} className="hover:bg-base-200/70">
                                      <td className="py-6 px-6">
                                        <div className="flex items-center gap-3">
                                          <span className="text-primary font-medium">{exercise.name}</span>
                                          {!isScreenshotMode && (
                                            <button
                                              onClick={() => {
                                                sortedWorkouts.forEach(workout => {
                                                  onDeleteExercise?.(workout.id, exercise.name);
                                                });
                                              }}
                                              className="btn btn-xs btn-ghost text-error"
                                              title="Delete exercise from all workouts"
                                            >
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                              </svg>
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                      {[...sortedWorkouts].reverse().map(workout => {
                                        const matchingExercise = workout.exercises?.find(e => e.name === exercise.name);
                                        return (
                                          <td key={workout.id} className="py-6 px-6 text-right">
                                            <div className="flex flex-col items-end gap-1.5">
                                              {matchingExercise?.stats?.map((stat, statIdx) => (
                                                <div key={statIdx} className="font-medium whitespace-nowrap">
                                                  {stat.reps || ''}{stat.weight ? ` × ${formatWeight(stat.weight)}` : ''}
                                                  {stat.weight ? <span className="text-sm ml-1 text-base-content/80">{getWeightUnit()}</span> : ''}
                                                  {stat.time ? <span className="text-sm ml-1 text-base-content/80">{stat.time}s</span> : ''}
                                                  {stat.distance ? <span className="text-sm ml-1 text-base-content/80">{stat.distance}mi</span> : ''}
                                                </div>
                                              ))}
                                            </div>
                                          </td>
                                        );
                                      })}
                                      <td className="py-6 px-6">
                                        <ExerciseNotes
                                          exerciseId={idx}
                                          initialNotes={exercise.notes}
                                          onSave={() => {}}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
              {!weeklyAverages.some(week => {
                const weekStart = new Date(week.weekStart);
                const weekEnd = new Date(week.weekEnd);
                return processedDailyData.some(day => {
                  const date = new Date(day.date);
                  return date >= weekStart && date <= weekEnd && day.workouts && day.workouts.length > 0;
                });
              }) && (
                <div className="text-center py-4 text-base-content/60">
                  No workouts recorded during this period
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 