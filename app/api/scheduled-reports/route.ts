import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { calculateNextRun, ScheduleType } from "@/libs/scheduling";

export const dynamic = "force-dynamic";

/**
 * GET /api/scheduled-reports
 * List all scheduled reports for the current user
 */
export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: schedules, error } = await supabase
    .from("scheduled_reports")
    .select(
      `
      *,
      client:clients(id, display_name, trainerize_client_id)
    `
    )
    .eq("trainer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    );
  }

  return NextResponse.json({ schedules });
}

/**
 * POST /api/scheduled-reports
 * Create new scheduled report(s)
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    clientIds,
    scheduleType,
    dayOfWeek,
    dayOfMonth,
    timeOfDay,
    reportParameters,
  } = body;

  // Validate required fields
  if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
    return NextResponse.json(
      { error: "clientIds is required and must be a non-empty array" },
      { status: 400 }
    );
  }

  if (!scheduleType || !["daily", "weekly", "monthly"].includes(scheduleType)) {
    return NextResponse.json(
      { error: "scheduleType must be 'daily', 'weekly', or 'monthly'" },
      { status: 400 }
    );
  }

  if (!timeOfDay || !/^\d{2}:\d{2}$/.test(timeOfDay)) {
    return NextResponse.json(
      { error: "timeOfDay must be in HH:MM format" },
      { status: 400 }
    );
  }

  if (scheduleType === "weekly" && (dayOfWeek === undefined || dayOfWeek === null)) {
    return NextResponse.json(
      { error: "dayOfWeek is required for weekly schedules" },
      { status: 400 }
    );
  }

  if (scheduleType === "monthly" && (dayOfMonth === undefined || dayOfMonth === null)) {
    return NextResponse.json(
      { error: "dayOfMonth is required for monthly schedules" },
      { status: 400 }
    );
  }

  // Verify client ownership
  const { data: clients, error: clientError } = await supabase
    .from("clients")
    .select("id, trainerize_client_id")
    .eq("trainer_id", user.id)
    .in("trainerize_client_id", clientIds);

  if (clientError || !clients) {
    console.error("Error verifying clients:", clientError);
    return NextResponse.json(
      { error: "Failed to verify client ownership" },
      { status: 500 }
    );
  }

  if (clients.length !== clientIds.length) {
    return NextResponse.json(
      { error: "One or more clients not found or not owned by you" },
      { status: 400 }
    );
  }

  // Calculate next run time
  const nextRunAt = calculateNextRun(
    scheduleType as ScheduleType,
    timeOfDay,
    dayOfWeek,
    dayOfMonth
  );

  // Prepare schedule records
  const schedules = clients.map((client) => ({
    client_id: client.id,
    trainer_id: user.id,
    schedule_type: scheduleType,
    day_of_week: scheduleType === "weekly" ? dayOfWeek : null,
    day_of_month: scheduleType === "monthly" ? dayOfMonth : null,
    time_of_day: timeOfDay,
    report_parameters: reportParameters || {
      start_date_offset: 7,
      end_date_offset: 0,
      min_reps: 8,
      max_reps: 12,
    },
    next_run_at: nextRunAt.toISOString(),
    is_active: true,
  }));

  // Insert schedules
  const { data: inserted, error: insertError } = await supabase
    .from("scheduled_reports")
    .insert(schedules)
    .select();

  if (insertError) {
    console.error("Error creating schedules:", insertError);
    return NextResponse.json(
      { error: "Failed to create schedules" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    created: inserted?.length || 0,
    schedules: inserted,
  });
}
