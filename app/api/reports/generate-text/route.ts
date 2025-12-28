import { createClient } from '@/libs/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { formatReportAsText } from '@/lib/report-text-formatter';

interface GenerateTextRequest {
  reportId?: string;  // Optional: use existing report
  clientId?: string;   // Required if no reportId
  dateRange?: {       // Required if no reportId
    from: string;
    to: string;
  };
  template?: 'daily' | 'weekly' | 'enhanced';  // Default: 'enhanced'
  weightUnit?: 'lbs' | 'kg';  // Default: 'lbs'
  goal?: 'fat loss' | 'maintenance' | 'muscle gain';  // Default: 'fat loss'
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body: GenerateTextRequest = await req.json();
    const { reportId, clientId, dateRange, template = 'enhanced', weightUnit = 'lbs', goal = 'fat loss' } = body;

    let reportData: any = null;
    let client: any = null;
    let dateRangeStart: string | undefined;
    let dateRangeEnd: string | undefined;

    // Option 1: Load existing report from database
    if (reportId) {
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select(`
          id,
          client_id,
          trainer_id,
          report_data,
          date_range_start,
          date_range_end,
          clients (
            id,
            first_name,
            last_name,
            email,
            notes
          )
        `)
        .eq('id', reportId)
        .eq('trainer_id', user.id)
        .single();

      if (reportError || !report) {
        return NextResponse.json(
          { error: 'Report not found or access denied' },
          { status: 404 }
        );
      }

      reportData = report.report_data;
      client = Array.isArray(report.clients) ? report.clients[0] : report.clients;
      dateRangeStart = report.date_range_start;
      dateRangeEnd = report.date_range_end;
    }
    // Option 2: Generate report data on-the-fly
    else if (clientId && dateRange?.from && dateRange?.to) {
      // Fetch client info
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('trainer_id', user.id)
        .single();

      if (clientError || !clientData) {
        return NextResponse.json(
          { error: 'Client not found or access denied' },
          { status: 404 }
        );
      }

      if (!clientData.trainerize_id) {
        return NextResponse.json(
          { error: 'Client does not have a Trainerize ID' },
          { status: 400 }
        );
      }

      client = clientData;
      dateRangeStart = dateRange.from;
      dateRangeEnd = dateRange.to;

      // Fetch report data from Trainerize APIs
      const startDate = new Date(dateRange.from).toISOString().split('T')[0];
      const endDate = new Date(dateRange.to).toISOString().split('T')[0];

      try {
        // Get the origin from the request URL
        const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        
        // Get auth headers to pass through
        const authHeader = req.headers.get('authorization') || req.headers.get('cookie');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (authHeader) {
          if (authHeader.startsWith('Bearer')) {
            headers['authorization'] = authHeader;
          } else {
            headers['cookie'] = authHeader;
          }
        }
        
        // Fetch all data in parallel (including goals)
        const [workoutDataRes, bodyStatsRes, healthDataRes, nutritionRes, sleepRes, goalsRes] = await Promise.all([
          fetch(`${origin}/api/trainerize/workouts`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              userID: clientData.trainerize_id,
              startDate,
              endDate,
              repRange: { min: 6, max: 10 } // Default rep range
            }),
          }),
          fetch(`${origin}/api/trainerize/bodystats`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              userID: clientData.trainerize_id,
              startDate,
              endDate,
              unitBodystats: 'inches',
              unitWeight: 'lbs',
            }),
          }),
          fetch(`${origin}/api/trainerize/health-data`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              userID: clientData.trainerize_id,
              type: 'step',
              startDate,
              endDate,
            }),
          }),
          fetch(`${origin}/api/trainerize/nutrition`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              userID: clientData.trainerize_id,
              startDate,
              endDate,
            }),
          }),
          fetch(`${origin}/api/trainerize/sleep-data`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              userID: clientData.trainerize_id,
              startDate,
              endDate,
            }),
          }),
          fetch(`${origin}/api/trainerize/goals`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              userID: clientData.trainerize_id,
            }),
          }),
        ]);

        const [workoutData, bodyStatsData, healthData, nutritionData, sleepData, goalsData] = await Promise.all([
          workoutDataRes.json(),
          bodyStatsRes.json(),
          healthDataRes.json(),
          nutritionRes.json(),
          sleepRes.json(),
          goalsRes.json().catch(() => ({ goals: [] as any[] })), // Goals are optional, don't fail if missing
        ]);

        // Fetch trainer's excluded workout names
        let excludedWorkoutNames: string[] = [];
        const { data: reportConfig } = await supabase
          .from('report_configurations')
          .select('excluded_workout_names')
          .eq('trainer_id', user.id)
          .single();
        
        if (reportConfig?.excluded_workout_names) {
          excludedWorkoutNames = reportConfig.excluded_workout_names;
        }

        // Filter out excluded workouts
        if (workoutData.workouts && excludedWorkoutNames.length > 0) {
          workoutData.workouts = workoutData.workouts.filter((workout: any) => {
            const workoutTitle = workout.title?.toLowerCase() || '';
            return !excludedWorkoutNames.some(excluded => 
              excluded.toLowerCase() === workoutTitle
            );
          });
        }

        // Process workout data to add automatic notes
        if (workoutData.workouts) {
          const maxReps = 10;
          workoutData.workouts = workoutData.workouts.map((workout: any) => {
            if (workout.exercises) {
              workout.exercises = workout.exercises.map((exercise: any) => {
                if (exercise.stats && exercise.stats.length > 0) {
                  const validReps = exercise.stats.filter((stat: any) => typeof stat.reps === 'number');
                  
                  if (validReps.length > 0) {
                    const isBodyweightMovement = validReps.every((stat: any) => 
                      typeof stat.reps === 'number' && 
                      (!stat.weight || stat.weight === 0)
                    );

                    const allSetsAtTopRange = validReps.every((stat: any) => stat.reps >= maxReps - 1);
                    
                    if (isBodyweightMovement) {
                      exercise.notes = allSetsAtTopRange 
                        ? "Focus on increasing the number of reps next session"
                        : "Focus on adding reps";
                    } else {
                      exercise.notes = allSetsAtTopRange 
                        ? "Increase weight next session"
                        : "Focus on adding reps";
                    }
                  }
                }
                
                return {
                  name: exercise.name,
                  sets: exercise.sets,
                  stats: exercise.stats,
                  notes: exercise.notes || "Focus on adding reps"
                };
              });
            }
            return workout;
          });
        }

        reportData = {
          bodyStats: bodyStatsData,
          healthData,
          nutritionData,
          sleepData,
          workoutData,
          goalsData: goalsData,
          template: template
        };
      } catch (fetchError) {
        console.error('Error fetching Trainerize data:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch client data from Trainerize' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Either reportId or (clientId and dateRange) must be provided' },
        { status: 400 }
      );
    }

    if (!reportData || !client) {
      return NextResponse.json(
        { error: 'Failed to load report data' },
        { status: 500 }
      );
    }

    // Format report as text
    const clientName = `${client.first_name} ${client.last_name}`;
    const clientNotes = 'notes' in client ? client.notes : null;
    const text = formatReportAsText(reportData, clientName, {
      template,
      weightUnit,
      dateRangeStart,
      dateRangeEnd,
      goal,
      clientNotes
    });

    return NextResponse.json({
      text,
      metadata: {
        clientName,
        dateRange: {
          from: dateRangeStart || '',
          to: dateRangeEnd || ''
        },
        template,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating text report:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

