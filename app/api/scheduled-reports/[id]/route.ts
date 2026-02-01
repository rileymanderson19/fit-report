import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { calculateNextRun, ScheduleType } from "@/libs/scheduling";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/scheduled-reports/[id]
 * Get a specific scheduled report
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: schedule, error } = await supabase
    .from("scheduled_reports")
    .select(
      `
      *,
      client:clients(id, display_name, trainerize_client_id)
    `
    )
    .eq("id", id)
    .eq("trainer_id", user.id)
    .single();

  if (error || !schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  return NextResponse.json({ schedule });
}

/**
 * PUT /api/scheduled-reports/[id]
 * Update a scheduled report
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from("scheduled_reports")
    .select("*")
    .eq("id", id)
    .eq("trainer_id", user.id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    scheduleType,
    dayOfWeek,
    dayOfMonth,
    timeOfDay,
    reportParameters,
    isActive,
  } = body;

  // Build update object
  const updates: Record<string, unknown> = {};

  if (scheduleType !== undefined) {
    if (!["daily", "weekly", "monthly"].includes(scheduleType)) {
      return NextResponse.json(
        { error: "scheduleType must be 'daily', 'weekly', or 'monthly'" },
        { status: 400 }
      );
    }
    updates.schedule_type = scheduleType;
  }

  if (dayOfWeek !== undefined) {
    updates.day_of_week = dayOfWeek;
  }

  if (dayOfMonth !== undefined) {
    updates.day_of_month = dayOfMonth;
  }

  if (timeOfDay !== undefined) {
    if (!/^\d{2}:\d{2}$/.test(timeOfDay)) {
      return NextResponse.json(
        { error: "timeOfDay must be in HH:MM format" },
        { status: 400 }
      );
    }
    updates.time_of_day = timeOfDay;
  }

  if (reportParameters !== undefined) {
    updates.report_parameters = reportParameters;
  }

  if (isActive !== undefined) {
    updates.is_active = isActive;
  }

  // Recalculate next_run_at if schedule changed
  const finalScheduleType = (updates.schedule_type ||
    existing.schedule_type) as ScheduleType;
  const finalTimeOfDay = (updates.time_of_day || existing.time_of_day) as string;
  const finalDayOfWeek = updates.day_of_week ?? existing.day_of_week;
  const finalDayOfMonth = updates.day_of_month ?? existing.day_of_month;

  if (
    updates.schedule_type ||
    updates.time_of_day ||
    updates.day_of_week !== undefined ||
    updates.day_of_month !== undefined
  ) {
    updates.next_run_at = calculateNextRun(
      finalScheduleType,
      finalTimeOfDay,
      finalDayOfWeek,
      finalDayOfMonth
    ).toISOString();
  }

  // Update the schedule
  const { data: updated, error: updateError } = await supabase
    .from("scheduled_reports")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating schedule:", updateError);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }

  return NextResponse.json({ schedule: updated });
}

/**
 * DELETE /api/scheduled-reports/[id]
 * Delete a scheduled report
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership and delete
  const { error: deleteError } = await supabase
    .from("scheduled_reports")
    .delete()
    .eq("id", id)
    .eq("trainer_id", user.id);

  if (deleteError) {
    console.error("Error deleting schedule:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
