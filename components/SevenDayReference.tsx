import React, { useMemo } from 'react';

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

interface SevenDayReferenceProps {
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
  };
  clientName?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

export function SevenDayReference({ 
  data, 
  clientName = "Client",
  dateRangeStart,
  dateRangeEnd
}: SevenDayReferenceProps) {
  // Process all data into daily format
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

    // Process health data (steps)
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
      const durationMs = endTime.getTime() - startTime.getTime();
      const sleepHours = durationMs / (1000 * 60 * 60);
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
        dailyData.get(date)!.sleepHours = sleepHours;
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
        if (!dailyData.get(date)!.workouts) {
          dailyData.get(date)!.workouts = [];
        }
        dailyData.get(date)!.workouts!.push(workout);
      }
    });

    // Generate the last 7 days of the reporting period
    if (dateRangeEnd) {
      // Parse the end date in local timezone to avoid timezone issues
      const [endYear, endMonth, endDay] = dateRangeEnd.split('T')[0].split('-').map(Number);
      const endDate = new Date(endYear, endMonth - 1, endDay);
      const last7Days: DailyData[] = [];
      
      // Generate 7 consecutive days ending on the reporting period end date
      for (let i = 6; i >= 0; i--) {
        const currentDate = new Date(endDate);
        currentDate.setDate(endDate.getDate() - i);
        // Use consistent date string formatting to match data processing
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Use existing data if available, otherwise create empty daily data
        const existingData = dailyData.get(dateStr);
        if (existingData) {
          last7Days.push(existingData);
        } else {
          last7Days.push({
            date: dateStr,
            weight: 0,
            steps: 0,
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
            sleepHours: 0,
            workouts: []
          });
        }
      }
      
      return last7Days;
    } else {
      // Fallback to original behavior if no date range provided
      return Array.from(dailyData.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-7); // Get last 7 days
    }
  }, [data, dateRangeEnd]);

  const formatDate = (dateStr: string) => {
    // Parse the date string and ensure we're working in local timezone
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[date.getDay()];
    const dayNum = date.getDate();
    return { dayName, dayNum };
  };

  const getProgressColor = (current: number, target: number) => {
    const percentage = current / target;
    if (percentage >= 0.9) return 'text-success';
    if (percentage >= 0.7) return 'text-warning';
    return 'text-error';
  };

  const getProgressBg = (current: number, target: number) => {
    const percentage = current / target;
    if (percentage >= 0.9) return 'bg-success/20';
    if (percentage >= 0.7) return 'bg-warning/20';
    return 'bg-error/20';
  };

  return (
    <div className="bg-base-200/50 border border-base-300 rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold">7-Day Reference</h3>
          <p className="text-sm text-base-content/70">
            Last 7 days overview - Reference only (not included in report)
          </p>
        </div>
        <div className="badge badge-ghost">
          Reference Tool
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 md:gap-3">
        {processedDailyData.map((day, index) => {
          const { dayName, dayNum } = formatDate(day.date);
          const stepsTarget = 10000;
          const hasAnyData = day.weight > 0 || day.steps > 0 || day.calories > 0 || day.sleepHours > 0 || (day.workouts && day.workouts.length > 0);
          
          return (
            <div 
              key={day.date} 
              className={`bg-base-100 rounded-lg p-2 md:p-4 border transition-shadow ${
                hasAnyData 
                  ? 'border-base-300 hover:shadow-md' 
                  : 'border-base-200 bg-base-50 opacity-75'
              }`}
            >
              {/* Date Header */}
              <div className="text-center mb-3">
                <div className="text-xs font-medium text-base-content/60">{dayName}</div>
                <div className="text-xl font-bold text-primary">{dayNum}</div>
              </div>

              {/* Weight */}
              {day.weight > 0 && (
                <div className="mb-2 text-center">
                  <div className="text-xs text-base-content/60">Weight</div>
                  <div className="text-sm font-medium">{day.weight.toFixed(1)} lbs</div>
                </div>
              )}

              {/* Steps */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-base-content/60">Steps</div>
                  <div className={`text-xs font-medium ${getProgressColor(day.steps, stepsTarget)}`}>
                    {day.steps > 0 ? day.steps.toLocaleString() : '-'}
                  </div>
                </div>
                <div className="w-full bg-base-200 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full transition-all ${
                      day.steps >= stepsTarget * 0.9 ? 'bg-success' : 
                      day.steps >= stepsTarget * 0.7 ? 'bg-warning' : 
                      day.steps > 0 ? 'bg-error' : 'bg-base-300'
                    }`}
                    style={{ width: `${Math.min((day.steps / stepsTarget) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* No data indicator for empty days */}
              {!hasAnyData && (
                <div className="text-center py-2">
                  <div className="text-xs text-base-content/40">No data</div>
                </div>
              )}

              

              {/* Nutrition Summary */}
              {day.calories > 0 && (
                <div className="mb-2 text-center">
                  <div className="text-xs text-base-content/60 mb-1">Nutrition</div>
                  <div className="text-xs">
                    <div>{day.calories.toFixed(0)} cal</div>
                    <div className="text-base-content/50">
                      P: {day.protein.toFixed(0)}g | C: {day.carbs.toFixed(0)}g | F: {day.fats.toFixed(0)}g
                    </div>
                  </div>
                </div>
              )}

              {/* Workouts */}
              {day.workouts && day.workouts.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs text-base-content/60 mb-1">Workouts</div>
                  <div className="space-y-1">
                    {day.workouts.slice(0, 2).map((workout, idx) => (
                      <div key={idx} className="text-xs p-1 bg-success/10 text-success rounded border">
                        {workout.title}
                      </div>
                    ))}
                    {day.workouts.length > 2 && (
                      <div className="text-xs text-base-content/50">
                        +{day.workouts.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sleep */}
              {day.sleepHours > 0 && (
                <div className="text-center">
                  <div className="text-xs text-base-content/60">Sleep</div>
                  <div className={`text-xs font-medium ${
                    day.sleepHours >= 7 ? 'text-success' : 
                    day.sleepHours >= 6 ? 'text-warning' : 'text-error'
                  }`}>
                    {day.sleepHours.toFixed(1)}h
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {processedDailyData.length === 0 && (
        <div className="text-center py-8 text-base-content/60">
          No data available for the 7-day reference period
        </div>
      )}
    </div>
  );
} 