import { createClient } from '@/libs/supabase/server';
import { NextResponse } from 'next/server';

interface CalendarItem {
  id: number;
  type: string;
  title: string;
  status: string;
  detail?: {
    workoutID?: number;
  };
}

interface CalendarDay {
  date: string;
  items: CalendarItem[];
}

interface CalendarResponse {
  calendar: CalendarDay[];
}

interface WorkoutBasic {
  id: number;
  title: string;
  date: string;
  workoutID?: number;
}

interface ExerciseStat {
  reps?: number;
  weight?: number;
  time?: number;
  distance?: number;
}

interface Exercise {
  def: {
    name: string;
    sets?: number;
  };
  stats?: ExerciseStat[];
  notes?: string;
}

interface WorkoutDetail {
  id: number;
  duration?: number;
  exercises?: Exercise[];
}

interface WorkoutResponse {
  dailyWorkouts: WorkoutDetail[];
}

export async function POST(request: Request) {
  try {
    // Initialize Supabase client
    const supabase = createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Trainerize credentials from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('trainerize_username, trainerize_password')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.trainerize_username || !profile?.trainerize_password) {
      return NextResponse.json({ error: 'Trainerize credentials not found' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { userID, startDate, endDate } = body;

    // Create Basic Auth header
    const credentials = Buffer.from(`${profile.trainerize_username}:${profile.trainerize_password}`).toString('base64');

    // Step 1: Get calendar data to find workout IDs
    const calendarResponse = await fetch('https://api.trainerize.com/v03/calendar/getList', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userID,
        startDate,
        endDate,
        unitDistance: 'miles',
        unitWeight: 'lbs'
      }),
    });

    if (!calendarResponse.ok) {
      const error = await calendarResponse.json();
      return NextResponse.json({ error: error.message || 'Failed to fetch calendar data' }, { status: calendarResponse.status });
    }

    const calendarData = await calendarResponse.json() as CalendarResponse;

    // Extract workout IDs and basic info
    const workouts: WorkoutBasic[] = [];
    calendarData.calendar?.forEach((day: CalendarDay) => {
      if (day.items) {
        day.items.forEach((item: CalendarItem) => {
          if (item.type === 'workoutRegular' && item.status === 'tracked') {
            workouts.push({
              id: item.id,
              title: item.title,
              date: day.date,
              workoutID: item.detail?.workoutID
            });
          }
        });
      }
    });

    // If no workouts found, return empty array
    if (workouts.length === 0) {
      return NextResponse.json({ workouts: [] });
    }

    // Step 2: Get detailed workout data for each workout
    const workoutResponse = await fetch('https://api.trainerize.com/v03/dailyWorkout/get', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids: workouts.map(w => w.id)
      }),
    });

    if (!workoutResponse.ok) {
      const error = await workoutResponse.json();
      return NextResponse.json({ error: error.message || 'Failed to fetch workout details' }, { status: workoutResponse.status });
    }

    const workoutData = await workoutResponse.json() as WorkoutResponse;

    // Process workout details and combine with basic info
    const processedWorkouts = workouts.map(workout => {
      const details = workoutData.dailyWorkouts?.find(w => w.id === workout.id);
      if (!details) return workout;

      return {
        ...workout,
        duration: details.duration,
        exercises: details.exercises?.map(exercise => ({
          name: exercise.def.name,
          sets: exercise.def.sets,
          stats: exercise.stats?.map(stat => ({
            reps: stat.reps,
            weight: stat.weight,
            time: stat.time,
            distance: stat.distance
          })),
          notes: exercise.notes || ''
        }))
      };
    });

    return NextResponse.json({ workouts: processedWorkouts });
  } catch (error) {
    console.error('Error in workouts route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 