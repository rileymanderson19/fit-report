import { createClient } from '@/libs/supabase/server';

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
    unitWeight = 'lbs'
  } = params;

  // Fetch all data from Trainerize APIs in parallel
  const [workoutDataRes, bodyStatsRes, healthDataRes, nutritionRes, sleepRes, goalsRes] = await Promise.all([
    fetch(`${origin}/api/trainerize/workouts`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        userID: trainerizeUserId,
        startDate,
        endDate,
        repRange
      }),
    }),
    fetch(`${origin}/api/trainerize/bodystats`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        userID: trainerizeUserId,
        startDate,
        endDate,
        unitBodystats,
        unitWeight,
      }),
    }),
    fetch(`${origin}/api/trainerize/health-data`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        userID: trainerizeUserId,
        type: 'step',
        startDate,
        endDate,
      }),
    }),
    fetch(`${origin}/api/trainerize/nutrition`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        userID: trainerizeUserId,
        startDate,
        endDate,
      }),
    }),
    fetch(`${origin}/api/trainerize/sleep-data`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        userID: trainerizeUserId,
        startDate,
        endDate,
      }),
    }),
    fetch(`${origin}/api/trainerize/goals`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        userID: trainerizeUserId,
      }),
    }),
  ]);

  // Parse responses
  const [workoutData, bodyStatsData, healthData, nutritionData, sleepData, goalsData] = await Promise.all([
    workoutDataRes.json(),
    bodyStatsRes.json(),
    healthDataRes.json(),
    nutritionRes.json(),
    sleepRes.json(),
    goalsRes.json().catch(() => ({ goals: [] as any[] })), // Goals are optional
  ]);

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
