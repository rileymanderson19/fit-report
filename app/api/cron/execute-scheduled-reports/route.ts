import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  calculateNextRun,
  getReportDateRange,
  ScheduledReport,
  ScheduleType,
} from "@/libs/scheduling";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minute timeout for cron

// Create admin client for cron job
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * GET /api/cron/execute-scheduled-reports
 * Execute all due scheduled reports
 *
 * This endpoint should be called by Vercel Cron every 15 minutes
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const results = {
    processed: 0,
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Find all due schedules
    const { data: dueSchedules, error: fetchError } = await supabase
      .from("scheduled_reports")
      .select(
        `
        *,
        client:clients(id, trainerize_client_id, display_name),
        trainer:profiles(id, trainerize_id)
      `
      )
      .eq("is_active", true)
      .lte("next_run_at", now.toISOString())
      .order("next_run_at", { ascending: true })
      .limit(50); // Process max 50 per run

    if (fetchError) {
      console.error("Error fetching due schedules:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch schedules" },
        { status: 500 }
      );
    }

    if (!dueSchedules || dueSchedules.length === 0) {
      return NextResponse.json({
        message: "No schedules due",
        results,
      });
    }

    console.log(`[Cron] Processing ${dueSchedules.length} due schedules`);

    // Process each schedule
    for (const schedule of dueSchedules) {
      results.processed++;

      try {
        // Get report date range
        const { startDate, endDate } = getReportDateRange(
          schedule.report_parameters
        );

        // Generate the report
        const reportResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/reports/generate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Use service role for internal calls
              "X-Internal-Request": "true",
            },
            body: JSON.stringify({
              clientId: schedule.client?.trainerize_client_id,
              trainerId: schedule.trainer_id,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              minReps: schedule.report_parameters.min_reps,
              maxReps: schedule.report_parameters.max_reps,
            }),
          }
        );

        if (!reportResponse.ok) {
          const errorData = await reportResponse.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Report generation failed: ${reportResponse.status}`
          );
        }

        const reportData = await reportResponse.json();

        // Send the report (if auto-send is enabled)
        if (reportData.reportUrl) {
          const sendResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SITE_URL}/api/trainerize/send-fitness-report`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Internal-Request": "true",
              },
              body: JSON.stringify({
                clientId: schedule.client?.trainerize_client_id,
                trainerId: schedule.trainer_id,
                reportUrl: reportData.reportUrl,
              }),
            }
          );

          if (!sendResponse.ok) {
            console.warn(
              `[Cron] Failed to send report for schedule ${schedule.id}`
            );
            // Don't fail the whole schedule if send fails
          }
        }

        // Calculate next run time
        const nextRunAt = calculateNextRun(
          schedule.schedule_type as ScheduleType,
          schedule.time_of_day,
          schedule.day_of_week,
          schedule.day_of_month,
          now
        );

        // Update schedule with last run and next run times
        const { error: updateError } = await supabase
          .from("scheduled_reports")
          .update({
            last_run_at: now.toISOString(),
            next_run_at: nextRunAt.toISOString(),
          })
          .eq("id", schedule.id);

        if (updateError) {
          console.error(
            `[Cron] Failed to update schedule ${schedule.id}:`,
            updateError
          );
        }

        // Log delivery
        await supabase.from("report_deliveries").insert({
          scheduled_report_id: schedule.id,
          client_id: schedule.client_id,
          trainer_id: schedule.trainer_id,
          status: "sent",
          report_url: reportData.reportUrl,
          delivered_at: now.toISOString(),
        });

        results.success++;
        console.log(
          `[Cron] Successfully processed schedule ${schedule.id} for client ${schedule.client?.display_name}`
        );
      } catch (error) {
        results.failed++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.errors.push(
          `Schedule ${schedule.id}: ${errorMessage}`
        );
        console.error(`[Cron] Error processing schedule ${schedule.id}:`, error);

        // Log failed delivery
        await supabase.from("report_deliveries").insert({
          scheduled_report_id: schedule.id,
          client_id: schedule.client_id,
          trainer_id: schedule.trainer_id,
          status: "failed",
          error_message: errorMessage,
          delivered_at: now.toISOString(),
        });
      }
    }

    console.log(
      `[Cron] Completed: ${results.success}/${results.processed} successful`
    );

    return NextResponse.json({
      message: "Scheduled reports processed",
      results,
    });
  } catch (error) {
    console.error("[Cron] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
