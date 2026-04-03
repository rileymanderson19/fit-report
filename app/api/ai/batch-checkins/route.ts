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
      .select("id, first_name, last_name, goal, notes")
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
    const validClientIds = validClients.map((c) => c.id);
    const reportDataByClient = new Map<string, any>();

    const { data: cacheEntries } = await supabase
      .from("report_cache")
      .select("client_id, report_data")
      .eq("trainer_id", user.id)
      .eq("status", "ready")
      .in("client_id", validClientIds)
      .gt("expires_at", new Date().toISOString())
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

    // Fetch coach profile once
    const { profile: coachProfile, exists: profileExists } =
      await fetchCoachProfile(supabase, user.id);

    // Generate messages concurrently
    const tasks = validClients.map((client) => async (): Promise<BatchResult> => {
      const reportData = reportDataByClient.get(client.id);
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
