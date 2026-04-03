import { createClient } from "@/libs/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  rateLimitMiddleware,
  getClientIdentifier,
  RateLimitPresets,
} from "@/libs/rateLimit";
import {
  generateCoachingMessage,
  fetchCoachProfile,
  type MetricsInput,
} from "@/lib/generate-coaching-message";
import { getTemplateById } from "@/lib/checkin-templates";
import { extractMetrics } from "@/lib/client-status";
import {
  getTrainerizeCredentials,
  createBasicAuthHeader,
} from "@/libs/trainerize/credentials";

const MAX_CLIENTS = 30;
const CONCURRENCY_LIMIT = 5;

interface BatchResult {
  clientId: string;
  clientName: string;
  message: string | null;
  error?: string | undefined;
  generatedAt?: string | undefined;
}

async function withConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  let i = 0;

  async function runNext(): Promise<void> {
    while (i < tasks.length) {
      const index = i++;
      try {
        const value = await tasks[index]();
        results[index] = { status: "fulfilled", value };
      } catch (reason: any) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () =>
    runNext()
  );
  await Promise.all(workers);
  return results;
}

/**
 * Fetch Trainerize data directly using the trainer's credentials.
 * Bypasses internal API routes (which require browser auth) by calling the
 * Trainerize API directly with Basic Auth.
 */
async function fetchTrainerizeDirect(
  trainerizeUserId: number,
  startDate: string,
  endDate: string,
  authHeader: string
): Promise<any> {
  const apiBase = "https://api.trainerize.com";
  const headers = {
    Authorization: authHeader,
    "Content-Type": "application/json",
  };

  // Fetch calendar, nutrition, body stats, health data in parallel
  const [calendarRes, nutritionRes, bodyStatsRes, healthRes, sleepRes] =
    await Promise.all([
      fetch(`${apiBase}/v03/calendar/getList`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userID: trainerizeUserId,
          startDate,
          endDate,
          unitDistance: "miles",
          unitWeight: "lbs",
        }),
      }),
      fetch(`${apiBase}/v03/nutrition/getList`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userID: trainerizeUserId,
          startDate,
          endDate,
        }),
      }),
      fetch(`${apiBase}/v03/bodyStat/getList`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userID: trainerizeUserId,
          startDate,
          endDate,
          unitBodystats: "inches",
          unitWeight: "lbs",
        }),
      }),
      fetch(`${apiBase}/v03/healthData/getList`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userID: trainerizeUserId,
          startDate,
          endDate,
        }),
      }),
      fetch(`${apiBase}/v03/sleep/getList`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          userID: trainerizeUserId,
          startDate,
          endDate,
        }),
      }),
    ]);

  // Parse responses (best-effort, partial data is fine)
  const calendarData = calendarRes.ok ? await calendarRes.json() : null;
  const nutritionData = nutritionRes.ok ? await nutritionRes.json() : null;
  const bodyStatsData = bodyStatsRes.ok ? await bodyStatsRes.json() : null;
  const healthData = healthRes.ok ? await healthRes.json() : null;
  const sleepData = sleepRes.ok ? await sleepRes.json() : null;

  // Extract workouts from calendar (same logic as /api/trainerize/workouts)
  const workouts: any[] = [];
  const workoutCalendar: any[] = [];

  if (calendarData?.calendar) {
    // First pass: collect workout IDs from calendar
    const workoutIds: { id: number; date: string; title: string }[] = [];

    for (const day of calendarData.calendar) {
      if (!day.items) continue;
      for (const item of day.items) {
        if (item.type === "workoutRegular") {
          workoutCalendar.push({
            date: day.date,
            title: item.title,
            status: item.status,
            id: item.id,
            workoutID: item.detail?.workoutID,
          });

          if (item.status === "tracked" && item.detail?.workoutID) {
            workoutIds.push({
              id: item.detail.workoutID,
              date: day.date,
              title: item.title,
            });
          }
        }
      }
    }

    // Second pass: fetch workout details for tracked workouts
    const detailPromises = workoutIds.map(async (w) => {
      try {
        const res = await fetch(`${apiBase}/v03/workout/getWorkout`, {
          method: "POST",
          headers,
          body: JSON.stringify({ workoutID: w.id }),
        });
        if (!res.ok) return null;
        const detail = await res.json();
        return {
          id: w.id,
          title: w.title,
          date: w.date,
          exercises: detail.dailyWorkouts?.[0]?.exercises?.map((e: any) => ({
            def: { name: e.def?.name, sets: e.def?.sets },
            stats: e.stats,
            notes: e.notes,
          })) || [],
          duration: detail.dailyWorkouts?.[0]?.duration,
        };
      } catch {
        return null;
      }
    });

    const details = await Promise.all(detailPromises);
    for (const d of details) {
      if (d) workouts.push(d);
    }
  }

  // Return in the same shape as generateReportData (what extractMetrics expects)
  return {
    workoutData: { workouts, workoutCalendar },
    nutritionData: nutritionData || { data: [] },
    bodyStats: bodyStatsData || { stats: [] },
    healthData: healthData || { data: [] },
    sleepData: sleepData || { data: [] },
  };
}

/**
 * POST /api/ai/batch-checkins
 * Generates coaching check-in messages for multiple clients using a template.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResult = await rateLimitMiddleware(
      getClientIdentifier(req, user.id),
      {
        ...RateLimitPresets.moderate,
        message:
          "Too many batch requests. Please wait before generating more check-ins.",
      }
    );
    if (rateLimitResult) return rateLimitResult;

    const body = await req.json();
    const { clientIds, templateId } = body as {
      clientIds: string[];
      templateId: string;
    };

    // Validate inputs
    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { error: "clientIds must be a non-empty array" },
        { status: 400 }
      );
    }
    if (clientIds.length > MAX_CLIENTS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_CLIENTS} clients per batch` },
        { status: 400 }
      );
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return NextResponse.json(
        { error: `Invalid templateId: ${templateId}` },
        { status: 400 }
      );
    }

    // Verify all clients belong to this trainer
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, first_name, last_name, goal, notes, trainerize_id")
      .eq("trainer_id", user.id)
      .eq("active", true)
      .in("id", clientIds);

    if (clientsError) {
      console.error("Error fetching clients:", clientsError);
      return NextResponse.json(
        { error: "Failed to fetch clients" },
        { status: 500 }
      );
    }

    const validClients = clients || [];
    if (validClients.length === 0) {
      return NextResponse.json(
        { error: "No valid clients found" },
        { status: 404 }
      );
    }

    // Step 1: Query report_cache (primary source — daily cron + on-demand generation)
    // No expiration filter — stale data is better than no data for check-in messages
    const validClientIds = validClients.map((c) => c.id);
    const reportDataByClient = new Map<string, any>();

    const { data: cacheEntries } = await supabase
      .from("report_cache")
      .select("client_id, report_data")
      .eq("trainer_id", user.id)
      .eq("status", "ready")
      .in("client_id", validClientIds)
      .order("created_at", { ascending: false });

    for (const entry of cacheEntries || []) {
      if (!reportDataByClient.has(entry.client_id)) {
        reportDataByClient.set(entry.client_id, entry.report_data);
      }
    }

    // Step 2: Fallback to reports table for clients not found in cache
    const missingClientIds = validClientIds.filter(
      (id) => !reportDataByClient.has(id)
    );

    if (missingClientIds.length > 0) {
      const { data: reportHeaders } = await supabase
        .from("reports")
        .select("id, client_id")
        .eq("trainer_id", user.id)
        .in("client_id", missingClientIds)
        .order("created_at", { ascending: false });

      const latestReportIdByClient = new Map<string, string>();
      for (const rh of reportHeaders || []) {
        if (!latestReportIdByClient.has(rh.client_id)) {
          latestReportIdByClient.set(rh.client_id, rh.id);
        }
      }

      const latestIds = Array.from(latestReportIdByClient.values());
      if (latestIds.length > 0) {
        const { data: reports } = await supabase
          .from("reports")
          .select("client_id, report_data")
          .in("id", latestIds);

        for (const report of reports || []) {
          if (!reportDataByClient.has(report.client_id)) {
            reportDataByClient.set(report.client_id, report.report_data);
          }
        }
      }
    }

    console.log(`[BATCH-CHECKINS] Data sources: ${reportDataByClient.size}/${validClientIds.length} clients have report data`);
    for (const clientId of validClientIds) {
      const data = reportDataByClient.get(clientId);
      if (data) {
        const workouts = data?.workoutData?.workouts;
        console.log(`[BATCH-CHECKINS] Client ${clientId}: workoutData exists=${!!data?.workoutData}, workouts count=${Array.isArray(workouts) ? workouts.length : 'N/A'}`);
      } else {
        console.log(`[BATCH-CHECKINS] Client ${clientId}: NO DATA in either report_cache or reports`);
      }
    }

    // Fetch coach profile once
    const { profile: coachProfile, exists: profileExists } =
      await fetchCoachProfile(supabase, user.id);

    // Get Trainerize credentials for direct API calls (needed for clients with no cached data)
    const trainerizeCreds = await getTrainerizeCredentials(user.id);
    const trainerizeAuth = trainerizeCreds
      ? `Basic ${createBasicAuthHeader(trainerizeCreds)}`
      : null;

    // Date range for fresh Trainerize pulls: last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    // Generate messages concurrently
    const tasks = validClients.map((client) => async (): Promise<BatchResult> => {
      let reportData = reportDataByClient.get(client.id);

      // If no cached data exists, fetch fresh from Trainerize API directly
      if (!reportData && client.trainerize_id && trainerizeAuth) {
        try {
          console.log(`[BATCH-CHECKINS] Client ${client.id}: fetching fresh Trainerize data directly`);
          reportData = await fetchTrainerizeDirect(
            client.trainerize_id,
            startDateStr,
            endDateStr,
            trainerizeAuth
          );
        } catch (err: any) {
          console.error(`[BATCH-CHECKINS] Client ${client.id}: Trainerize fetch failed:`, err.message);
        }
      }

      let metrics: MetricsInput;
      if (reportData) {
        metrics = extractMetrics(reportData);
      } else {
        metrics = {
          latestWeight: null,
          weightChange: null,
          avgCalories: null,
          avgProtein: null,
          avgDailySteps: null,
          avgSleep: null,
          totalWorkouts: 0,
          scheduledWorkouts: 0,
          workoutDays: 0,
        };
      }

      const result = await generateCoachingMessage({
        clientName: `${client.first_name} ${client.last_name}`,
        goal: client.goal,
        notes: client.notes,
        metrics,
        coachProfile,
        promptModifier: template.promptModifier,
      });

      return {
        clientId: client.id,
        clientName: `${client.first_name} ${client.last_name}`,
        message: result.checkInMessage,
        generatedAt: new Date().toISOString(),
      };
    });

    const settled = await withConcurrency(tasks, CONCURRENCY_LIMIT);

    const results: BatchResult[] = settled.map((s, i) => {
      if (s.status === "fulfilled") {
        return s.value;
      }
      const client = validClients[i];
      const errorResult: BatchResult = {
        clientId: client.id,
        clientName: `${client.first_name} ${client.last_name}`,
        message: null,
        error: s.reason?.message || "Failed to generate message",
      };
      return errorResult;
    });

    const succeeded = results.filter((r) => r.message !== null).length;
    const failed = results.filter((r) => r.message === null).length;

    return NextResponse.json({
      results,
      stats: { total: results.length, succeeded, failed },
      missingProfile: !profileExists,
    });
  } catch (error: any) {
    console.error("Error in /api/ai/batch-checkins:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
