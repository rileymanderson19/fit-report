import { createClient } from '@/libs/supabase/server';
import { getTrainerizeDataWithCache, type TrainerizeCacheParams } from './trainerize-cache';

export interface RepRange {
  min: number;
  max: number;
}

export interface ReportGenerationParams {
  trainerizeUserId: number;
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string;   // ISO date string (YYYY-MM-DD)
  repRange?: RepRange;
  trainerId: string;
  unitBodystats?: 'inches' | 'cm';
  unitWeight?: 'lbs' | 'kg';
  clientId?: string; // Optional: enables Trainerize response caching
  enableTrainerizeCache?: boolean; // Optional: default true if clientId provided
}

export interface ReportData {
  bodyStats: any;
  healthData: any;
  nutritionData: any;
  sleepData: any;
  workoutData: any;
  goalsData?: any;
  template?: 'daily' | 'enhanced';
}

/**
 * Helper to fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Helper to safely fetch and parse Trainerize data with timeout and fallback
 */
async function safeFetchTrainerize(
  endpoint: string,
  origin: string,
  authHeaders: Record<string, string>,
  body: any,
  dataType: string,
  timeout: number = 30000,
  cacheParams?: { trainerId: string; clientId: string; type: string; startDate?: string; endDate?: string },
  enableCache: boolean = false
): Promise<{ data: any; error: string | null }> {
  // Function to perform the actual fetch
  const performFetch = async () => {
    const startTime = performance.now();
    const response = await fetchWithTimeout(
      `${origin}/api/trainerize/${endpoint}`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body)
      },
      timeout
    );

    const duration = performance.now() - startTime;

    if (!response.ok) {
      console.error(`[TRAINERIZE] ${dataType} fetch failed: ${response.status} in ${duration.toFixed(2)}ms`);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`[TRAINERIZE] ${dataType} fetched successfully in ${duration.toFixed(2)}ms`);
    return data;
  };

  try {
    // Use cache if enabled and params provided
    if (enableCache && cacheParams) {
      const data = await getTrainerizeDataWithCache(
        cacheParams as TrainerizeCacheParams,
        performFetch,
        true
      );
      return { data, error: null };
    }

    // Otherwise fetch directly
    const data = await performFetch();
    return { data, error: null };
  } catch (error) {
    console.error(`[TRAINERIZE] ${dataType} fetch error:`, error);
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Fetches Trainerize data, applies excluded workout filtering, and generates progressive overload notes.
 * This is the centralized report generation logic used by both visual reports and text reports.
 */
export async function generateReportData(
  params: ReportGenerationParams,
  origin: string,
  authHeaders: Record<string, string>
): Promise<ReportData> {
  const {
    trainerizeUserId,
    startDate,
    endDate,
    repRange = { min: 6, max: 10 },
    trainerId,
    unitBodystats = 'inches',
    unitWeight = 'lbs',
    clientId,
    enableTrainerizeCache = !!clientId // Enable cache by default if clientId provided
  } = params;

  // Fetch all data from Trainerize APIs in parallel with timeout and error handling
  const [workoutResult, bodyStatsResult, healthResult, nutritionResult, sleepResult, goalsResult] = await Promise.all([
    safeFetchTrainerize(
      'workouts',
      origin,
      authHeaders,
      { userID: trainerizeUserId, startDate, endDate, repRange },
      'Workouts',
      30000,
      clientId ? { trainerId, clientId, type: 'workouts', startDate, endDate } : undefined,
      enableTrainerizeCache
    ),
    safeFetchTrainerize(
      'bodystats',
      origin,
      authHeaders,
      { userID: trainerizeUserId, startDate, endDate, unitBodystats, unitWeight },
      'Body Stats',
      30000,
      clientId ? { trainerId, clientId, type: 'bodystats', startDate, endDate } : undefined,
      enableTrainerizeCache
    ),
    safeFetchTrainerize(
      'health-data',
      origin,
      authHeaders,
      { userID: trainerizeUserId, type: 'step', startDate, endDate },
      'Health Data',
      30000,
      clientId ? { trainerId, clientId, type: 'health-data', startDate, endDate } : undefined,
      enableTrainerizeCache
    ),
    safeFetchTrainerize(
      'nutrition',
      origin,
      authHeaders,
      { userID: trainerizeUserId, startDate, endDate },
      'Nutrition',
      30000,
      clientId ? { trainerId, clientId, type: 'nutrition', startDate, endDate } : undefined,
      enableTrainerizeCache
    ),
    safeFetchTrainerize(
      'sleep-data',
      origin,
      authHeaders,
      { userID: trainerizeUserId, startDate, endDate },
      'Sleep',
      30000,
      clientId ? { trainerId, clientId, type: 'sleep-data', startDate, endDate } : undefined,
      enableTrainerizeCache
    ),
    safeFetchTrainerize(
      'goals',
      origin,
      authHeaders,
      { userID: trainerizeUserId },
      'Goals',
      30000,
      clientId ? { trainerId, clientId, type: 'goals' } : undefined,
      enableTrainerizeCache
    )
  ]);

  // Use fetched data with fallbacks for missing data
  const workoutData = workoutResult.data || { workouts: [] };
  const bodyStatsData = bodyStatsResult.data || { stats: [] };
  const healthData = healthResult.data || { data: [] };
  const nutritionData = nutritionResult.data || { data: [] };
  const sleepData = sleepResult.data || { data: [] };
  const goalsData = goalsResult.data || { goals: [] };

  // Log any errors (but continue with partial data)
  const errors = [
    workoutResult.error && `Workouts: ${workoutResult.error}`,
    bodyStatsResult.error && `Body Stats: ${bodyStatsResult.error}`,
    healthResult.error && `Health Data: ${healthResult.error}`,
    nutritionResult.error && `Nutrition: ${nutritionResult.error}`,
    sleepResult.error && `Sleep: ${sleepResult.error}`,
    goalsResult.error && `Goals: ${goalsResult.error}`
  ].filter(Boolean);

  if (errors.length > 0) {
    console.warn(`[REPORT GEN] Partial failure - ${errors.length} endpoints failed:`, errors);
  }

  // Apply excluded workout filtering
  const excludedWorkoutNames = await getExcludedWorkoutNames(trainerId);
  const filteredWorkoutData = filterExcludedWorkouts(workoutData, excludedWorkoutNames);

  // Generate progressive overload notes
  const workoutDataWithNotes = addProgressiveOverloadNotes(filteredWorkoutData, repRange.max);

  return {
    bodyStats: bodyStatsData,
    healthData,
    nutritionData,
    sleepData,
    workoutData: workoutDataWithNotes,
    goalsData,
  };
}

/**
 * Fetches the trainer's excluded workout names from report_configurations table
 */
async function getExcludedWorkoutNames(trainerId: string): Promise<string[]> {
  const supabase = createClient();

  const { data: reportConfig } = await supabase
    .from('report_configurations')
    .select('excluded_workout_names')
    .eq('trainer_id', trainerId)
    .single();

  return reportConfig?.excluded_workout_names || [];
}

/**
 * Filters out workouts that match the excluded workout names (case-insensitive)
 */
function filterExcludedWorkouts(workoutData: any, excludedWorkoutNames: string[]): any {
  if (!workoutData.workouts || excludedWorkoutNames.length === 0) {
    return workoutData;
  }

  return {
    ...workoutData,
    workouts: workoutData.workouts.filter((workout: any) => {
      const workoutTitle = workout.title?.toLowerCase() || '';
      return !excludedWorkoutNames.some(excluded =>
        excluded.toLowerCase() === workoutTitle
      );
    })
  };
}

/**
 * Analyzes workout stats and adds progressive overload coaching notes to each exercise
 */
function addProgressiveOverloadNotes(workoutData: any, maxReps: number): any {
  if (!workoutData.workouts) {
    return workoutData;
  }

  return {
    ...workoutData,
    workouts: workoutData.workouts.map((workout: any) => {
      if (!workout.exercises) {
        return workout;
      }

      return {
        ...workout,
        exercises: workout.exercises.map((exercise: any) => {
          let notes = "Focus on adding reps"; // Default note

          if (exercise.stats && exercise.stats.length > 0) {
            const validReps = exercise.stats.filter((stat: any) => typeof stat.reps === 'number');

            if (validReps.length > 0) {
              const isBodyweightMovement = validReps.every((stat: any) =>
                typeof stat.reps === 'number' &&
                (!stat.weight || stat.weight === 0)
              );

              const allSetsAtTopRange = validReps.every((stat: any) => stat.reps >= maxReps - 1);

              if (isBodyweightMovement) {
                notes = allSetsAtTopRange
                  ? "Focus on increasing the number of reps next session"
                  : "Focus on adding reps";
              } else {
                notes = allSetsAtTopRange
                  ? "Increase weight next session"
                  : "Focus on adding reps";
              }
            }
          }

          return {
            name: exercise.name,
            sets: exercise.sets,
            stats: exercise.stats,
            notes: exercise.notes || notes
          };
        })
      };
    })
  };
}
