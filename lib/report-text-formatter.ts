// Text formatter for fitness reports - converts report data to markdown text

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

interface ReportData {
  bodyStats?: {
    bodyStats?: Array<{
      date: string;
      weight: number;
    }>;
  };
  healthData?: {
    healthData?: Array<{
      date: string;
      data?: {
        steps: number;
      };
    }>;
  };
  nutritionData?: {
    nutrition?: Array<{
      date: string;
      calories: number;
      proteinGrams: number;
      carbsGrams: number;
      fatGrams: number;
    }>;
  };
  sleepData?: {
    isTracked?: boolean;
    sleep?: Array<{
      id: number;
      userID: number;
      source: string;
      startTime: string;
      endTime: string;
      type: string;
    }>;
  };
  workoutData?: {
    workouts?: Workout[];
  };
  goalsData?: {
    goals?: Array<{
      id?: number;
      name?: string;
      type?: string;
      value?: number;
      unit?: string;
      targetCalories?: number;
      targetProtein?: number;
      targetCarbs?: number;
      targetFat?: number;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    }>;
  };
  template?: 'daily' | 'weekly' | 'enhanced';
}

// Process raw report data into DailyData format
export function processDailyData(
  data: ReportData,
  dateRangeStart?: string
): DailyData[] {
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
      const entry = dailyData.get(date)!;
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
}

// Calculate averages only for days with data
function calculateAverage(data: DailyData[], metric: keyof DailyData): number {
  const validData = data.filter(day => {
    const value = day[metric];
    return typeof value === 'number' && value > 0;
  });
  if (validData.length === 0) return 0;
  const sum = validData.reduce((acc, day) => acc + (day[metric] as number), 0);
  return sum / validData.length;
}

// Calculate weekly averages
export function calculateWeeklyAverages(
  dailyData: DailyData[],
  dateRangeStart?: string
): WeeklyAverage[] {
  if (dailyData.length === 0) return [];

  const rangeStart = dateRangeStart 
    ? new Date(dateRangeStart.split('T')[0])
    : new Date(dailyData[0].date);

  const weeks: WeeklyAverage[] = [];
  let currentWeekStart = new Date(rangeStart);
  let weekNumber = 1;

  const lastDataDate = new Date(dailyData[dailyData.length - 1].date);
  
  while (currentWeekStart <= lastDataDate && weekNumber <= 10) {
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

    const currentWeekData = dailyData.filter(dayData => {
      const dataDate = new Date(dayData.date);
      return dataDate >= currentWeekStart && dataDate <= currentWeekEnd;
    });

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

    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    weekNumber++;
  }

  return weeks;
}

// Formatting helpers
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
}

function formatNumber(num: number, decimals: number = 1): string {
  return num.toFixed(decimals);
}

function formatWeight(weightLbs: number, useMetric: boolean): string {
  const convertedWeight = useMetric ? weightLbs * 0.453592 : weightLbs;
  if (useMetric) {
    return Math.round(convertedWeight).toString();
  } else {
    return convertedWeight % 1 === 0 ? convertedWeight.toString() : formatNumber(convertedWeight, 1);
  }
}

function getWeightUnit(useMetric: boolean): string {
  return useMetric ? 'kg' : 'lbs';
}

// Extract nutritional goals from goals data
function extractNutritionalGoals(goalsData?: any): {
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
} {
  const goals: { calories?: number; protein?: number; carbs?: number; fats?: number } = {};
  
  if (!goalsData?.goals || !Array.isArray(goalsData.goals)) {
    return goals;
  }
  
  // Look for nutritional goals in the goals array
  goalsData.goals.forEach((goal: any) => {
    // Check for direct goal values
    if (goal.targetCalories || goal.calories) {
      goals.calories = goal.targetCalories || goal.calories;
    }
    if (goal.targetProtein || goal.protein) {
      goals.protein = goal.targetProtein || goal.protein;
    }
    if (goal.targetCarbs || goal.carbs) {
      goals.carbs = goal.targetCarbs || goal.carbs;
    }
    if (goal.targetFat || goal.fat) {
      goals.fats = goal.targetFat || goal.fat;
    }
    
    // Also check by type/name if available
    if (goal.type || goal.name) {
      const type = (goal.type || goal.name || '').toLowerCase();
      if (type.includes('calorie') && goal.value) {
        goals.calories = goal.value;
      } else if (type.includes('protein') && goal.value) {
        goals.protein = goal.value;
      } else if ((type.includes('carb') || type.includes('carbohydrate')) && goal.value) {
        goals.carbs = goal.value;
      } else if (type.includes('fat') && goal.value) {
        goals.fats = goal.value;
      }
    }
  });
  
  return goals;
}

// Check if this is a single week or multiple weeks
function getTimeSpanInfo(dailyData: DailyData[]): { isSingleWeek: boolean; numberOfWeeks: number } {
  if (dailyData.length === 0) return { isSingleWeek: true, numberOfWeeks: 0 };
  
  const firstDate = new Date(dailyData[0].date);
  const lastDate = new Date(dailyData[dailyData.length - 1].date);
  const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    isSingleWeek: daysDiff <= 7,
    numberOfWeeks: Math.ceil(daysDiff / 7)
  };
}

// Format daily template
function formatDailyReport(
  dailyData: DailyData[],
  clientName: string,
  dateRangeStart?: string,
  dateRangeEnd?: string,
  useMetric: boolean = false,
  goalsData?: any
): string {
  const lines: string[] = [];
  
  // LLM-Optimized Header with inline metadata
  lines.push(`# FITNESS REPORT`);
  lines.push('');
  lines.push(`**Client:** ${clientName}`);
  if (dateRangeStart && dateRangeEnd) {
    const start = formatDate(dateRangeStart.split('T')[0]);
    const end = formatDate(dateRangeEnd.split('T')[0]);
    const startDate = new Date(dateRangeStart.split('T')[0]);
    const endDate = new Date(dateRangeEnd.split('T')[0]);
    const daysInReport = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    lines.push(`**Period:** ${start} to ${end} (${daysInReport} days)`);
  }
  lines.push(`**Weight Unit:** ${getWeightUnit(useMetric)}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Extract nutritional goals
  const nutritionalGoals = extractNutritionalGoals(goalsData);
  const hasGoals = nutritionalGoals.calories || nutritionalGoals.protein || nutritionalGoals.carbs || nutritionalGoals.fats;
  
  // Helper function to format goal comparison with status indicator
  const formatGoalComparison = (actual: number, goal: number | undefined, unit: string = ''): string => {
    if (!goal || actual <= 0) return actual > 0 ? formatNumber(actual, unit === 'g' ? 0 : 1) : '-';
    const percent = (actual / goal) * 100;
    const diff = actual - goal;
    let status = '';
    if (percent >= 95 && percent <= 105) {
      status = '✓'; // Met (within 5%)
    } else if (percent < 95) {
      status = '✗'; // Missed
    } else {
      status = '+'; // Exceeded
    }
    return `${formatNumber(actual, unit === 'g' ? 0 : 1)} ${status} (goal: ${formatNumber(goal, unit === 'g' ? 0 : 1)})`;
  };
  
  // Daily Metrics Table
  lines.push('## Daily Metrics\n');
  
  // Build table header with goals if available
  if (hasGoals) {
    lines.push('| Date | Weight (' + getWeightUnit(useMetric) + ') | Steps | Calories | Protein (g) | Carbs (g) | Fats (g) | Sleep (hrs) |');
    lines.push('|------|------|-------|----------|-------------|-----------|----------|-------------|');
    lines.push('| | | | *Goal indicators: ✓ = met, ✗ = missed, + = exceeded* | | | | |');
  } else {
    lines.push('| Date | Weight (' + getWeightUnit(useMetric) + ') | Steps | Calories | Protein (g) | Carbs (g) | Fats (g) | Sleep (hrs) |');
    lines.push('|------|------|-------|----------|-------------|-----------|----------|-------------|');
  }
  
  dailyData.forEach(day => {
    const date = formatDate(day.date);
    const weight = day.weight > 0 ? formatWeight(day.weight, useMetric) : '-';
    const steps = day.steps > 0 ? formatNumber(day.steps, 0) : '-';
    
    // Format nutrition with goals and status indicators
    const calories = hasGoals && nutritionalGoals.calories 
      ? formatGoalComparison(day.calories, nutritionalGoals.calories)
      : (day.calories > 0 ? formatNumber(day.calories, 0) : '-');
    
    const protein = hasGoals && nutritionalGoals.protein
      ? formatGoalComparison(day.protein, nutritionalGoals.protein, 'g')
      : (day.protein > 0 ? formatNumber(day.protein) : '-');
    
    const carbs = hasGoals && nutritionalGoals.carbs
      ? formatGoalComparison(day.carbs, nutritionalGoals.carbs, 'g')
      : (day.carbs > 0 ? formatNumber(day.carbs) : '-');
    
    const fats = hasGoals && nutritionalGoals.fats
      ? formatGoalComparison(day.fats, nutritionalGoals.fats, 'g')
      : (day.fats > 0 ? formatNumber(day.fats) : '-');
    
    const sleep = day.sleepHours > 0 ? formatNumber(day.sleepHours) : '-';
    
    lines.push(`| ${date} | ${weight} | ${steps} | ${calories} | ${protein} | ${carbs} | ${fats} | ${sleep} |`);
  });
  
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Daily Workouts
  lines.push('## Daily Workouts\n');
  
  const daysWithWorkouts = dailyData.filter(day => day.workouts && day.workouts.length > 0);
  
  if (daysWithWorkouts.length === 0) {
    lines.push('No workouts recorded during this period.\n');
  } else {
    daysWithWorkouts.forEach(day => {
      lines.push(`### ${formatDate(day.date)}\n`);
      
      day.workouts!.forEach(workout => {
        lines.push(`**${workout.title}**\n`);
        
        if (workout.exercises && workout.exercises.length > 0) {
          // Filter out walking exercises
          const filteredExercises = workout.exercises.filter(exercise => 
            !exercise.name.toLowerCase().includes('walking') &&
            !exercise.name.toLowerCase().includes('walk')
          );
          
          if (filteredExercises.length > 0) {
            lines.push('| Exercise | Sets |');
            lines.push('|----------|------|');
            
            filteredExercises.forEach(exercise => {
              const setsInfo = exercise.stats?.map(stat => {
                let setStr = '';
                if (stat.reps) setStr += `${stat.reps} reps`;
                if (stat.weight) {
                  setStr += setStr ? ' × ' : '';
                  setStr += `${formatWeight(stat.weight, useMetric)} ${getWeightUnit(useMetric)}`;
                }
                if (stat.time) {
                  setStr += setStr ? ' × ' : '';
                  setStr += `${stat.time}s`;
                }
                if (stat.distance) {
                  setStr += setStr ? ' × ' : '';
                  setStr += `${stat.distance}mi`;
                }
                return setStr;
              }).join(', ') || '-';
              
              lines.push(`| **${exercise.name}** | ${setsInfo} |`);
              
              if (exercise.notes) {
                lines.push(`  *${exercise.notes}*`);
              }
            });
            
            lines.push('');
          }
        }
      });
    });
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');
  
  return lines.join('\n');
}

// Format weekly template
function formatWeeklyReport(
  dailyData: DailyData[],
  weeklyAverages: WeeklyAverage[],
  clientName: string,
  dateRangeStart?: string,
  dateRangeEnd?: string,
  useMetric: boolean = false,
  goalsData?: any
): string {
  const lines: string[] = [];
  
  // LLM-Optimized Header with inline metadata
  lines.push(`# FITNESS REPORT`);
  lines.push('');
  lines.push(`**Client:** ${clientName}`);
  if (dateRangeStart && dateRangeEnd) {
    const start = formatDate(dateRangeStart.split('T')[0]);
    const end = formatDate(dateRangeEnd.split('T')[0]);
    const startDate = new Date(dateRangeStart.split('T')[0]);
    const endDate = new Date(dateRangeEnd.split('T')[0]);
    const daysInReport = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    lines.push(`**Period:** ${start} to ${end} (${daysInReport} days)`);
  }
  lines.push(`**Weight Unit:** ${getWeightUnit(useMetric)}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Weekly Workout Summary
  lines.push('## Weekly Workout Summary\n');
  
  // Group all workouts by title across all weeks
  const allWorkouts = weeklyAverages.flatMap(week => {
    const weekStart = new Date(week.weekStart);
    const weekEnd = new Date(week.weekEnd);
    return dailyData
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
  
  if (Object.keys(workoutGroups).length === 0) {
    lines.push('No workouts recorded during this period.\n');
  } else {
    Object.entries(workoutGroups).forEach(([title, workouts]) => {
      // Sort workouts by date and limit to 2 most recent
      const sortedWorkouts = [...workouts]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 2);
      
      lines.push(`### ${title}\n`);
      
      if (sortedWorkouts[0].exercises && sortedWorkouts[0].exercises.length > 0) {
        // Filter out walking exercises
        const filteredExercises = sortedWorkouts[0].exercises.filter(exercise => 
          !exercise.name.toLowerCase().includes('walking') &&
          !exercise.name.toLowerCase().includes('walk')
        );
        
        if (filteredExercises.length > 0) {
          // Create table header
          const headerRow = ['Exercise', ...sortedWorkouts.reverse().map(w => formatDate(w.date))];
          lines.push('| ' + headerRow.join(' | ') + ' |');
          lines.push('|' + headerRow.map(() => '---').join('|') + '|');
          
          filteredExercises.forEach(exercise => {
            const row: string[] = [`**${exercise.name}**`];
            
            sortedWorkouts.forEach(workout => {
              const matchingExercise = workout.exercises?.find(e => e.name === exercise.name);
              if (matchingExercise?.stats && matchingExercise.stats.length > 0) {
                const setsInfo = matchingExercise.stats.map(stat => {
                  let setStr = '';
                  if (stat.reps) setStr += `${stat.reps}`;
                  if (stat.weight) {
                    setStr += setStr ? ' × ' : '';
                    setStr += `${formatWeight(stat.weight, useMetric)}${getWeightUnit(useMetric)}`;
                  }
                  if (stat.time) {
                    setStr += setStr ? ' × ' : '';
                    setStr += `${stat.time}s`;
                  }
                  if (stat.distance) {
                    setStr += setStr ? ' × ' : '';
                    setStr += `${stat.distance}mi`;
                  }
                  return setStr;
                }).join(', ');
                row.push(setsInfo);
              } else {
                row.push('-');
              }
            });
            
            lines.push('| ' + row.join(' | ') + ' |');
            
            if (exercise.notes) {
              lines.push(`  *${exercise.notes}*`);
            }
          });
          
          lines.push('');
        }
      }
    });
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');
  
  return lines.join('\n');
}

// Calculate consistency analysis (for enhanced template)
interface ConsistencyAnalysis {
  workouts: {
    workoutsPerWeek: number;
    missedWorkouts: number;
    totalWorkouts: number;
    scheduledWorkouts: number;
    consistency: number;
  };
  sleep: { avg: number; max: number; min: number; consistency: number };
  steps: { avg: number; max: number; min: number; consistency: number };
  protein: { avg: number; max: number; min: number; consistency: number };
  calories: { avg: number; max: number; min: number; consistency: number };
  weight: { avg: number; latest: number; min: number; consistency: number; weeklyTrend: number };
  overallScore: number;
}

function calculateConsistencyAnalysis(
  dailyData: DailyData[],
  weeklyAverages: WeeklyAverage[]
): ConsistencyAnalysis | null {
  if (dailyData.length === 0) return null;

  const calculateConsistency = (values: number[]): number => {
    if (values.length <= 1) return 100;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    return Math.max(0, (1 - coefficientOfVariation) * 100);
  };

  const calculateStats = (values: number[]) => {
    if (values.length === 0) return { avg: 0, max: 0, min: 0, consistency: 0 };
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const consistency = calculateConsistency(values);
    return { avg, max, min, consistency };
  };

  // Data availability
  const hasSteps = dailyData.some(day => day.steps > 0);
  const hasSleep = dailyData.some(day => day.sleepHours > 0);
  const hasProtein = dailyData.some(day => day.protein > 0);
  const hasCalories = dailyData.some(day => day.calories > 0);
  const hasWeight = dailyData.some(day => day.weight > 0);
  const hasWorkouts = dailyData.some(day => day.workouts && day.workouts.length > 0);

  // Workout analysis
  const totalWeeks = weeklyAverages.length;
  const workoutDays = dailyData.filter(day => day.workouts && day.workouts.length > 0).length;
  const totalWorkouts = dailyData.reduce((sum, day) => sum + (day.workouts?.length || 0), 0);
  const workoutsPerWeek = totalWeeks > 0 ? totalWorkouts / totalWeeks : 0;
  const actualWorkoutsPerWeek = totalWeeks > 0 ? totalWorkouts / totalWeeks : 0;
  const expectedTotalWorkouts = Math.round(actualWorkoutsPerWeek * totalWeeks);
  const missedWorkouts = Math.max(0, expectedTotalWorkouts - totalWorkouts);
  
  const workoutStats = {
    workoutsPerWeek,
    missedWorkouts,
    totalWorkouts,
    scheduledWorkouts: expectedTotalWorkouts,
    consistency: dailyData.length > 0 ? (workoutDays / dailyData.length) * 100 : 0
  };

  // Other stats
  const sleepValues = dailyData.map(d => d.sleepHours).filter(s => s > 0);
  const sleepStats = calculateStats(sleepValues);

  const stepValues = dailyData.map(d => d.steps).filter(s => s > 0);
  const stepStats = calculateStats(stepValues);

  const calorieValues = dailyData.map(d => d.calories).filter(c => c > 0);
  const calorieStats = calculateStats(calorieValues);

  const proteinValues = dailyData.map(d => d.protein).filter(p => p > 0);
  const proteinStats = calculateStats(proteinValues);

  // Weight analysis
  const weightValues = dailyData.map(d => d.weight).filter(w => w > 0);
  let weightStats = { avg: 0, latest: 0, min: 0, consistency: 0, weeklyTrend: 0 };
  
  if (weightValues.length > 0) {
    const avg = weightValues.reduce((sum, val) => sum + val, 0) / weightValues.length;
    const min = Math.min(...weightValues);
    const consistency = calculateConsistency(weightValues);
    
    const sortedWeightEntries = dailyData
      .filter(d => d.weight > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latestWeight = sortedWeightEntries.length > 0 
      ? sortedWeightEntries[sortedWeightEntries.length - 1].weight 
      : 0;
    
    let weeklyTrend = 0;
    if (weeklyAverages.length >= 2) {
      const firstWeekWeight = weeklyAverages[0].avgWeight;
      const lastWeekWeight = weeklyAverages[weeklyAverages.length - 1].avgWeight;
      const totalWeeksForWeight = weeklyAverages.length - 1;
      weeklyTrend = totalWeeksForWeight > 0 ? (lastWeekWeight - firstWeekWeight) / totalWeeksForWeight : 0;
    }
    
    weightStats = {
      avg,
      latest: latestWeight,
      min,
      consistency,
      weeklyTrend
    };
  }

  // Overall score
  const availableMetrics = [];
  if (hasWorkouts) availableMetrics.push(workoutStats.consistency);
  if (hasSleep) availableMetrics.push(sleepStats.consistency);
  if (hasSteps) availableMetrics.push(stepStats.consistency);
  if (hasProtein) availableMetrics.push(proteinStats.consistency);
  if (hasCalories) availableMetrics.push(calorieStats.consistency);

  const overallScore = availableMetrics.length > 0 ? 
    availableMetrics.reduce((sum, val) => sum + val, 0) / availableMetrics.length : 0;

  return {
    workouts: workoutStats,
    sleep: sleepStats,
    steps: stepStats,
    protein: proteinStats,
    calories: calorieStats,
    weight: weightStats,
    overallScore
  };
}

// Calculate trends (for enhanced template)
function calculateTrends(weeklyAverages: WeeklyAverage[]): Record<string, any> | null {
  if (weeklyAverages.length < 2) return null;

  const latest = weeklyAverages[weeklyAverages.length - 1];
  const previous = weeklyAverages[weeklyAverages.length - 2];

  const calculateTrend = (current: number, prev: number) => {
    if (current === 0 && prev === 0) return null;
    const change = ((current - prev) / prev) * 100;
    return {
      change,
      direction: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
      magnitude: Math.abs(change)
    };
  };

  const trends: { [key: string]: any } = {};
  
  if (latest.avgWeight > 0 || previous.avgWeight > 0) {
    trends.weight = calculateTrend(latest.avgWeight, previous.avgWeight);
  }
  if (latest.avgSteps > 0 || previous.avgSteps > 0) {
    trends.steps = calculateTrend(latest.avgSteps, previous.avgSteps);
  }
  if (latest.avgSleepHours > 0 || previous.avgSleepHours > 0) {
    trends.sleep = calculateTrend(latest.avgSleepHours, previous.avgSleepHours);
  }
  if (latest.avgProtein > 0 || previous.avgProtein > 0) {
    trends.protein = calculateTrend(latest.avgProtein, previous.avgProtein);
  }

  return Object.keys(trends).length > 0 ? trends : null;
}

// Calculate improvement areas (for enhanced template)
function calculateImprovementAreas(dailyData: DailyData[]): Array<{
  area: string;
  priority: string;
  current: string;
  target: string;
  recommendation: string;
}> {
  if (!dailyData.length) return [];

  const hasSteps = dailyData.some(day => day.steps > 0);
  const hasSleep = dailyData.some(day => day.sleepHours > 0);
  const hasWorkouts = dailyData.some(day => day.workouts && day.workouts.length > 0);
  const hasProtein = dailyData.some(day => day.protein > 0);

  const areas = [];
  
  if (hasSteps) {
    const avgSteps = dailyData.reduce((sum, day) => sum + day.steps, 0) / dailyData.length;
    if (avgSteps < 7000) {
      areas.push({
        area: 'Daily Activity',
        priority: avgSteps < 5000 ? 'high' : 'medium',
        current: `${Math.round(avgSteps).toLocaleString()} steps/day`,
        target: '8,000-10,000 steps/day',
        recommendation: 'Add 2-3 short walks throughout the day'
      });
    }
  }

  if (hasSleep) {
    const sleepDays = dailyData.filter(day => day.sleepHours > 0);
    const avgSleep = sleepDays.length > 0 
      ? sleepDays.reduce((sum, day) => sum + day.sleepHours, 0) / sleepDays.length 
      : 0;
    if (avgSleep < 7) {
      areas.push({
        area: 'Sleep Duration',
        priority: avgSleep < 6 ? 'high' : 'medium',
        current: `${avgSleep.toFixed(1)} hours/night`,
        target: '7-9 hours/night',
        recommendation: 'Establish consistent bedtime routine'
      });
    }
  }

  if (hasWorkouts) {
    const workoutDays = dailyData.filter(day => day.workouts && day.workouts.length > 0).length;
    if (workoutDays / dailyData.length < 0.4) {
      areas.push({
        area: 'Training Frequency',
        priority: workoutDays / dailyData.length < 0.2 ? 'high' : 'medium',
        current: `${workoutDays} days/${dailyData.length} days`,
        target: '3-4 days/week',
        recommendation: 'Schedule specific training days'
      });
    }
  }

  if (hasProtein) {
    const avgProtein = dailyData.reduce((sum, day) => sum + day.protein, 0) / dailyData.length;
    if (avgProtein < 80) {
      areas.push({
        area: 'Protein Intake',
        priority: 'medium',
        current: `${avgProtein.toFixed(0)}g/day`,
        target: '80-120g/day',
        recommendation: 'Add protein source to each meal'
      });
    }
  }

  return areas.sort((a, b) => {
    const priorityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

// Format enhanced template
function formatEnhancedReport(
  dailyData: DailyData[],
  weeklyAverages: WeeklyAverage[],
  clientName: string,
  dateRangeStart?: string,
  dateRangeEnd?: string,
  useMetric: boolean = false,
  goalsData?: any
): string {
  const lines: string[] = [];
  
  // LLM-Optimized Header with inline metadata
  lines.push(`# FITNESS REPORT`);
  lines.push('');
  lines.push(`**Client:** ${clientName}`);
  if (dateRangeStart && dateRangeEnd) {
    const start = formatDate(dateRangeStart.split('T')[0]);
    const end = formatDate(dateRangeEnd.split('T')[0]);
    const startDate = new Date(dateRangeStart.split('T')[0]);
    const endDate = new Date(dateRangeEnd.split('T')[0]);
    const daysInReport = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    lines.push(`**Period:** ${start} to ${end} (${daysInReport} days)`);
  }
  lines.push(`**Weight Unit:** ${getWeightUnit(useMetric)}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Extract nutritional goals for display
  const nutritionalGoals = extractNutritionalGoals(goalsData);
  const hasGoals = nutritionalGoals.calories || nutritionalGoals.protein || nutritionalGoals.carbs || nutritionalGoals.fats;
  
  // Consistency Analysis
  const consistencyAnalysis = calculateConsistencyAnalysis(dailyData, weeklyAverages);
  
  if (consistencyAnalysis) {
    lines.push('## Consistency Analysis\n');
    lines.push('*Consistency scores indicate how consistent the client was with each metric (0-100%, higher is better)*\n');
    
    const metrics = [];
    if (dailyData.some(d => d.weight > 0)) {
      metrics.push({
        label: 'Weight',
        main: `${consistencyAnalysis.weight.avg.toFixed(1)} ${getWeightUnit(useMetric)}`,
        trend: `${consistencyAnalysis.weight.weeklyTrend >= 0 ? '+' : ''}${consistencyAnalysis.weight.weeklyTrend.toFixed(1)} ${getWeightUnit(useMetric)}/week`,
        latest: `${consistencyAnalysis.weight.latest.toFixed(1)} latest`,
        lowest: `${consistencyAnalysis.weight.min.toFixed(1)} lowest`
      });
    }
    if (dailyData.some(d => d.sleepHours > 0)) {
      metrics.push({
        label: 'Sleep',
        main: `${consistencyAnalysis.sleep.avg.toFixed(1)} hrs`,
        trend: `${consistencyAnalysis.sleep.avg.toFixed(1)} hrs average`,
        high: `${consistencyAnalysis.sleep.max.toFixed(1)} hrs high`,
        low: `${consistencyAnalysis.sleep.min.toFixed(1)} hrs low`
      });
    }
    if (dailyData.some(d => d.workouts && d.workouts.length > 0)) {
      metrics.push({
        label: 'Training',
        main: `${consistencyAnalysis.workouts.workoutsPerWeek.toFixed(1)}/week`,
        trend: `${Math.round(consistencyAnalysis.workouts.missedWorkouts)} missed`,
        high: `${Math.round(consistencyAnalysis.workouts.scheduledWorkouts)} scheduled`,
        low: `${consistencyAnalysis.workouts.totalWorkouts} completed`
      });
    }
    if (dailyData.some(d => d.calories > 0)) {
      metrics.push({
        label: 'Calories',
        main: `${Math.round(consistencyAnalysis.calories.avg)} cals`,
        trend: `${Math.round(consistencyAnalysis.calories.avg)} average`,
        high: `${Math.round(consistencyAnalysis.calories.max)} high`,
        low: `${Math.round(consistencyAnalysis.calories.min)} low`
      });
    }
    if (dailyData.some(d => d.protein > 0)) {
      metrics.push({
        label: 'Protein',
        main: `${Math.round(consistencyAnalysis.protein.avg)}g`,
        trend: `${Math.round(consistencyAnalysis.protein.avg)} average`,
        high: `${Math.round(consistencyAnalysis.protein.max)} high`,
        low: `${Math.round(consistencyAnalysis.protein.min)} low`
      });
    }
    if (dailyData.some(d => d.steps > 0)) {
      metrics.push({
        label: 'Activity',
        main: `${Math.round(consistencyAnalysis.steps.avg).toLocaleString()}`,
        trend: `${Math.round(consistencyAnalysis.steps.avg).toLocaleString()} avg`,
        high: `${Math.round(consistencyAnalysis.steps.max).toLocaleString()} high`,
        low: `${Math.round(consistencyAnalysis.steps.min).toLocaleString()} low`
      });
    }
    
    metrics.forEach(metric => {
      lines.push(`### ${metric.label}`);
      lines.push(`- **Average:** ${metric.main}`);
      lines.push(`- **Trend:** ${metric.trend}`);
      if (metric.high) lines.push(`- **High:** ${metric.high}`);
      if (metric.low) lines.push(`- **Low:** ${metric.low}`);
      if (metric.latest) lines.push(`- **Latest:** ${metric.latest}`);
      if (metric.lowest) lines.push(`- **Lowest:** ${metric.lowest}`);
      lines.push('');
    });
  }
  
  lines.push('---');
  lines.push('');
  
  // Weekly Progress Summary
  if (weeklyAverages.length > 0) {
    lines.push('## Weekly Progress Summary\n');
    
    weeklyAverages.forEach(week => {
      const weekStart = formatDate(week.weekStart);
      const weekEnd = formatDate(week.weekEnd);
      lines.push(`### ${weekStart} - ${weekEnd}\n`);
      
      const weekStats: string[] = [];
      if (dailyData.some(d => d.weight > 0)) {
        weekStats.push(`Weight: ${week.avgWeight.toFixed(1)} ${getWeightUnit(useMetric)}`);
      }
      if (dailyData.some(d => d.calories > 0)) {
        weekStats.push(`Calories: ${Math.round(week.avgCalories).toLocaleString()}`);
      }
      if (dailyData.some(d => d.protein > 0)) {
        weekStats.push(`Protein: ${Math.round(week.avgProtein)}g`);
      }
      if (dailyData.some(d => d.steps > 0)) {
        weekStats.push(`Steps: ${Math.round(week.avgSteps).toLocaleString()}`);
      }
      if (dailyData.some(d => d.workouts && d.workouts.length > 0)) {
        const workoutsThisWeek = dailyData
          .filter(day => {
            const date = new Date(day.date);
            const weekStartDate = new Date(week.weekStart);
            const weekEndDate = new Date(week.weekEnd);
            return date >= weekStartDate && date <= weekEndDate && day.workouts && day.workouts.length > 0;
          })
          .reduce((total, day) => total + (day.workouts?.length || 0), 0);
        weekStats.push(`Workouts: ${workoutsThisWeek}`);
      }
      if (dailyData.some(d => d.sleepHours > 0)) {
        weekStats.push(`Sleep: ${week.avgSleepHours.toFixed(1)} hrs`);
      }
      
      lines.push(weekStats.join(' • '));
      lines.push('');
    });
  }
  
  lines.push('---');
  lines.push('');
  
  // Trends
  const trends = calculateTrends(weeklyAverages);
  if (trends && Object.keys(trends).length > 0) {
    lines.push('## Trends\n');
    Object.entries(trends).forEach(([key, trend]) => {
      if (trend) {
        const emoji = trend.direction === 'improving' ? '📈' : trend.direction === 'declining' ? '📉' : '➡️';
        lines.push(`- **${key.charAt(0).toUpperCase() + key.slice(1)}:** ${emoji} ${trend.direction} (${trend.change >= 0 ? '+' : ''}${trend.change.toFixed(1)}%)`);
      }
    });
    lines.push('');
  }
  
  // Coaching Highlights Section - LLM Optimized
  lines.push('## Coaching Highlights\n');
  lines.push('*Key insights for coaching conversations*\n');
  
  // Areas of Concern
  const improvementAreas = calculateImprovementAreas(dailyData);
  const highPriorityAreas = improvementAreas.filter(a => a.priority === 'high');
  const mediumPriorityAreas = improvementAreas.filter(a => a.priority === 'medium');
  
  if (highPriorityAreas.length > 0 || mediumPriorityAreas.length > 0) {
    lines.push('### Areas of Concern\n');
    if (highPriorityAreas.length > 0) {
      lines.push('**High Priority:**');
      highPriorityAreas.forEach(area => {
        lines.push(`- **${area.area}:** Current: ${area.current}, Target: ${area.target}`);
        lines.push(`  → Recommendation: ${area.recommendation}`);
      });
      lines.push('');
    }
    if (mediumPriorityAreas.length > 0) {
      lines.push('**Medium Priority:**');
      mediumPriorityAreas.forEach(area => {
        lines.push(`- **${area.area}:** Current: ${area.current}, Target: ${area.target}`);
        lines.push(`  → Recommendation: ${area.recommendation}`);
      });
      lines.push('');
    }
  }
  
  // Areas of Improvement (positive trends)
  if (trends && Object.keys(trends).length > 0) {
    const improvingTrends = Object.entries(trends).filter(([_, trend]: [string, any]) => 
      trend && trend.direction === 'improving'
    );
    if (improvingTrends.length > 0) {
      lines.push('### Areas of Improvement\n');
      improvingTrends.forEach(([key, trend]: [string, any]) => {
        const metricName = key.charAt(0).toUpperCase() + key.slice(1);
        lines.push(`- **${metricName}:** Improving trend (+${trend.change.toFixed(1)}%)`);
      });
      lines.push('');
    }
  }
  
  // Goal Achievement Summary
  if (hasGoals && nutritionalGoals) {
    lines.push('### Goal Achievement Summary\n');
    const goalSummary: string[] = [];
    
    if (nutritionalGoals.calories) {
      const avgCalories = dailyData.filter(d => d.calories > 0).reduce((sum, d) => sum + d.calories, 0) / 
        dailyData.filter(d => d.calories > 0).length || 0;
      const caloriesMet = avgCalories >= nutritionalGoals.calories * 0.95 && avgCalories <= nutritionalGoals.calories * 1.05;
      goalSummary.push(`- **Calories:** ${caloriesMet ? '✓ Meeting goal' : avgCalories < nutritionalGoals.calories ? '✗ Below goal' : '+ Exceeding goal'} (avg: ${Math.round(avgCalories)}, goal: ${Math.round(nutritionalGoals.calories)})`);
    }
    
    if (nutritionalGoals.protein) {
      const avgProtein = dailyData.filter(d => d.protein > 0).reduce((sum, d) => sum + d.protein, 0) / 
        dailyData.filter(d => d.protein > 0).length || 0;
      const proteinMet = avgProtein >= nutritionalGoals.protein * 0.95 && avgProtein <= nutritionalGoals.protein * 1.05;
      goalSummary.push(`- **Protein:** ${proteinMet ? '✓ Meeting goal' : avgProtein < nutritionalGoals.protein ? '✗ Below goal' : '+ Exceeding goal'} (avg: ${Math.round(avgProtein)}g, goal: ${Math.round(nutritionalGoals.protein)}g)`);
    }
    
    if (nutritionalGoals.carbs) {
      const avgCarbs = dailyData.filter(d => d.carbs > 0).reduce((sum, d) => sum + d.carbs, 0) / 
        dailyData.filter(d => d.carbs > 0).length || 0;
      const carbsMet = avgCarbs >= nutritionalGoals.carbs * 0.95 && avgCarbs <= nutritionalGoals.carbs * 1.05;
      goalSummary.push(`- **Carbs:** ${carbsMet ? '✓ Meeting goal' : avgCarbs < nutritionalGoals.carbs ? '✗ Below goal' : '+ Exceeding goal'} (avg: ${Math.round(avgCarbs)}g, goal: ${Math.round(nutritionalGoals.carbs)}g)`);
    }
    
    if (nutritionalGoals.fats) {
      const avgFats = dailyData.filter(d => d.fats > 0).reduce((sum, d) => sum + d.fats, 0) / 
        dailyData.filter(d => d.fats > 0).length || 0;
      const fatsMet = avgFats >= nutritionalGoals.fats * 0.95 && avgFats <= nutritionalGoals.fats * 1.05;
      goalSummary.push(`- **Fats:** ${fatsMet ? '✓ Meeting goal' : avgFats < nutritionalGoals.fats ? '✗ Below goal' : '+ Exceeding goal'} (avg: ${Math.round(avgFats)}g, goal: ${Math.round(nutritionalGoals.fats)}g)`);
    }
    
    if (goalSummary.length > 0) {
      lines.push(...goalSummary);
      lines.push('');
    }
  }
  
  // Consistency Summary
  if (consistencyAnalysis) {
    lines.push('### Consistency Summary\n');
    const consistencyItems: string[] = [];
    
    if (dailyData.some(d => d.workouts && d.workouts.length > 0)) {
      const workoutConsistency = consistencyAnalysis.workouts.consistency;
      const workoutStatus = workoutConsistency >= 70 ? '✓ Good' : workoutConsistency >= 50 ? '⚠ Moderate' : '✗ Low';
      consistencyItems.push(`- **Training Consistency:** ${workoutConsistency.toFixed(0)}% (${workoutStatus}) - ${consistencyAnalysis.workouts.totalWorkouts} workouts completed`);
    }
    
    if (dailyData.some(d => d.protein > 0)) {
      const proteinConsistency = consistencyAnalysis.protein.consistency;
      const proteinStatus = proteinConsistency >= 70 ? '✓ Good' : proteinConsistency >= 50 ? '⚠ Moderate' : '✗ Low';
      consistencyItems.push(`- **Protein Consistency:** ${proteinConsistency.toFixed(0)}% (${proteinStatus})`);
    }
    
    if (dailyData.some(d => d.sleepHours > 0)) {
      const sleepConsistency = consistencyAnalysis.sleep.consistency;
      const sleepStatus = sleepConsistency >= 70 ? '✓ Good' : sleepConsistency >= 50 ? '⚠ Moderate' : '✗ Low';
      consistencyItems.push(`- **Sleep Consistency:** ${sleepConsistency.toFixed(0)}% (${sleepStatus})`);
    }
    
    if (consistencyItems.length > 0) {
      lines.push(...consistencyItems);
      lines.push('');
    }
  }
  
  lines.push('---');
  lines.push('');
  
  lines.push('---');
  lines.push('');
  
  // Include daily metrics and workouts (same as daily template)
  lines.push('## Detailed Daily Metrics\n');
  const dailyReportLines = formatDailyReport(dailyData, clientName, dateRangeStart, dateRangeEnd, useMetric, goalsData).split('\n');
  // Skip the header from daily report since we already have one
  const dailyContentStart = dailyReportLines.findIndex(line => line.startsWith('##'));
  if (dailyContentStart >= 0) {
    lines.push(...dailyReportLines.slice(dailyContentStart));
  } else {
    lines.push(...dailyReportLines.slice(2)); // Skip header lines
  }
  
  return lines.join('\n');
}

// Main export function
export function formatReportAsText(
  data: ReportData,
  clientName: string,
  options: {
    template?: 'daily' | 'weekly' | 'enhanced';
    weightUnit?: 'lbs' | 'kg';
    dateRangeStart?: string;
    dateRangeEnd?: string;
  } = {}
): string {
  const template = options.template || data.template || 'enhanced';
  const useMetric = options.weightUnit === 'kg';
  const dateRangeStart = options.dateRangeStart;
  const dateRangeEnd = options.dateRangeEnd;
  
  // Process data
  const dailyData = processDailyData(data, dateRangeStart);
  
  if (dailyData.length === 0) {
    return `# Fitness Report: ${clientName}\n\nNo data available for this period.`;
  }
  
  // Determine template based on time span if not explicitly set
  let finalTemplate = template;
  if (template === 'enhanced' || !template) {
    finalTemplate = 'enhanced';
  } else if (template === 'daily') {
    finalTemplate = 'daily';
  } else {
    const timeSpanInfo = getTimeSpanInfo(dailyData);
    finalTemplate = timeSpanInfo.isSingleWeek ? 'daily' : 'weekly';
  }
  
  // Calculate weekly averages if needed
  const weeklyAverages = (finalTemplate === 'weekly' || finalTemplate === 'enhanced')
    ? calculateWeeklyAverages(dailyData, dateRangeStart)
    : [];
  
  // Format based on template
  switch (finalTemplate) {
    case 'daily':
      return formatDailyReport(dailyData, clientName, dateRangeStart, dateRangeEnd, useMetric, data.goalsData);
    case 'weekly':
      return formatWeeklyReport(dailyData, weeklyAverages, clientName, dateRangeStart, dateRangeEnd, useMetric, data.goalsData);
    case 'enhanced':
      return formatEnhancedReport(dailyData, weeklyAverages, clientName, dateRangeStart, dateRangeEnd, useMetric, data.goalsData);
    default:
      return formatEnhancedReport(dailyData, weeklyAverages, clientName, dateRangeStart, dateRangeEnd, useMetric, data.goalsData);
  }
}

