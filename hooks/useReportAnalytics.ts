import { useMemo } from 'react';

export interface DailyData {
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

export interface WeeklyAverage {
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

export interface ConsistencyAnalysis {
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
  weight: { avg: number; latest: number; min: number; consistency: number; weeklyTrend: number; start: number };
  overallScore: number;
}

export interface DataAvailability {
  steps: boolean;
  sleep: boolean;
  protein: boolean;
  calories: boolean;
  weight: boolean;
  workouts: boolean;
}

export function useReportAnalytics(dailyData: DailyData[], weeklyAverages: WeeklyAverage[]) {
  // Check data availability for each metric
  const dataAvailability = useMemo<DataAvailability>(() => {
    const hasSteps = dailyData.some(day => day.steps > 0);
    const hasSleep = dailyData.some(day => day.sleepHours > 0);
    const hasProtein = dailyData.some(day => day.protein > 0);
    const hasCalories = dailyData.some(day => day.calories > 0);
    const hasWeight = dailyData.some(day => day.weight > 0);
    const hasWorkouts = dailyData.some(day => day.workouts && day.workouts.length > 0);

    return {
      steps: hasSteps,
      sleep: hasSleep,
      protein: hasProtein,
      calories: hasCalories,
      weight: hasWeight,
      workouts: hasWorkouts
    };
  }, [dailyData]);

  // Calculate consistency metrics
  const consistencyAnalysis = useMemo<ConsistencyAnalysis | null>(() => {
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
      consistency: (workoutDays / dailyData.length) * 100
    };

    // Sleep analysis
    const sleepValues = dailyData.map(d => d.sleepHours).filter(s => s > 0);
    const sleepStats = calculateStats(sleepValues);

    // Activity analysis
    const stepValues = dailyData.map(d => d.steps).filter(s => s > 0);
    const stepStats = calculateStats(stepValues);

    // Calories analysis
    const calorieValues = dailyData.map(d => d.calories).filter(c => c > 0);
    const calorieStats = calculateStats(calorieValues);

    // Protein analysis
    const proteinValues = dailyData.map(d => d.protein).filter(p => p > 0);
    const proteinStats = calculateStats(proteinValues);

    // Weight analysis
    const weightValues = dailyData.map(d => d.weight).filter(w => w > 0);
    let weightStats = { avg: 0, latest: 0, min: 0, consistency: 0, weeklyTrend: 0, start: 0 };

    if (weightValues.length > 0) {
      const avg = weightValues.reduce((sum, val) => sum + val, 0) / weightValues.length;
      const min = Math.min(...weightValues);
      const consistency = calculateConsistency(weightValues);

      // Sort by date to get start and latest
      const sortedWeightEntries = dailyData
        .filter(d => d.weight > 0)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const startWeight = sortedWeightEntries.length > 0
        ? sortedWeightEntries[0].weight
        : 0;
      const latestWeight = sortedWeightEntries.length > 0
        ? sortedWeightEntries[sortedWeightEntries.length - 1].weight
        : 0;

      // Calculate weekly trend
      let weeklyTrend = 0;
      if (weeklyAverages.length >= 2) {
        const firstWeekWeight = weeklyAverages[0].avgWeight;
        const lastWeekWeight = weeklyAverages[weeklyAverages.length - 1].avgWeight;
        const totalWeeksForWeight = weeklyAverages.length - 1;
        weeklyTrend = (lastWeekWeight - firstWeekWeight) / totalWeeksForWeight;
      }

      weightStats = {
        avg,
        latest: latestWeight,
        min,
        consistency,
        weeklyTrend,
        start: startWeight
      };
    }

    // Calculate overall score
    const availableMetrics: number[] = [];
    if (dataAvailability.workouts) availableMetrics.push(workoutStats.consistency);
    if (dataAvailability.sleep) availableMetrics.push(sleepStats.consistency);
    if (dataAvailability.steps) availableMetrics.push(stepStats.consistency);
    if (dataAvailability.protein) availableMetrics.push(proteinStats.consistency);
    if (dataAvailability.calories) availableMetrics.push(calorieStats.consistency);

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
  }, [dailyData, weeklyAverages, dataAvailability]);

  // Find best performance day
  const bestDay = useMemo(() => {
    if (dailyData.length === 0) return null;

    let bestScore = -1;
    let bestDayData: DailyData | null = null;
    const highlights: string[] = [];

    for (const day of dailyData) {
      let score = 0;
      const dayHighlights: string[] = [];

      // Score based on various metrics
      if (day.workouts && day.workouts.length > 0) {
        score += 30;
        dayHighlights.push(`${day.workouts.length} workout${day.workouts.length > 1 ? 's' : ''}`);
      }
      if (day.steps >= 10000) {
        score += 20;
        dayHighlights.push(`${day.steps.toLocaleString()} steps`);
      } else if (day.steps >= 7000) {
        score += 10;
      }
      if (day.protein >= 100) {
        score += 15;
        dayHighlights.push(`${Math.round(day.protein)}g protein`);
      }
      if (day.sleepHours >= 7) {
        score += 15;
        dayHighlights.push(`${day.sleepHours.toFixed(1)}hrs sleep`);
      }
      if (day.calories > 0 && day.calories <= 2500) {
        score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestDayData = day;
        highlights.length = 0;
        highlights.push(...dayHighlights);
      }
    }

    if (!bestDayData) return null;

    return {
      date: bestDayData.date,
      highlights
    };
  }, [dailyData]);

  return {
    dataAvailability,
    consistencyAnalysis,
    bestDay
  };
}
