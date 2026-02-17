import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { handleApiError } from "@/libs/errorHandler";
import { computeClientStatus, type ClientStatusResult } from "@/lib/client-status";

export const dynamic = "force-dynamic";

export interface DashboardClient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  goal: "fat_loss" | "maintenance" | "muscle_gain" | null;
  notes: string | null;
  created_at: string;
  manual_status: "on_track" | "watch" | "needs_attention" | "new";
  computed: ClientStatusResult;
}

export async function GET() {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all active clients including manual status
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, first_name, last_name, email, goal, notes, status, created_at")
      .eq("trainer_id", user.id)
      .eq("active", true)
      .order("first_name", { ascending: true });

    if (clientsError) {
      console.error("[DASHBOARD] Clients query failed:", clientsError);
      throw clientsError;
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({
        clients: [],
        stats: { total: 0, onTrack: 0, watch: 0, needsAttention: 0, new: 0, noData: 0 },
      });
    }

    const clientIds = clients.map((c) => c.id);

    // Step 1: Lightweight query — get report headers (no report_data) to find latest per client
    const { data: reportHeaders, error: headersError } = await supabase
      .from("reports")
      .select("id, client_id, date_range_start, date_range_end, created_at")
      .eq("trainer_id", user.id)
      .in("client_id", clientIds)
      .order("created_at", { ascending: false });

    if (headersError) {
      console.error("[DASHBOARD] Report headers query failed:", headersError);
      throw headersError;
    }

    // Pick the single most recent report ID per client
    const latestReportIdByClient = new Map<string, string>();
    for (const rh of reportHeaders || []) {
      if (!latestReportIdByClient.has(rh.client_id)) {
        latestReportIdByClient.set(rh.client_id, rh.id);
      }
    }

    // Step 2: Fetch only those latest reports with full report_data
    const latestIds = Array.from(latestReportIdByClient.values());
    const latestReportByClient = new Map<string, any>();

    if (latestIds.length > 0) {
      const { data: reports, error: reportsError } = await supabase
        .from("reports")
        .select("client_id, report_data, date_range_start, date_range_end, created_at")
        .in("id", latestIds);

      if (reportsError) {
        console.error("[DASHBOARD] Reports data query failed:", reportsError);
        // Don't throw — proceed without report metrics
      } else {
        for (const report of reports || []) {
          latestReportByClient.set(report.client_id, report);
        }
      }
    }

    // Compute status for each client
    const dashboardClients: DashboardClient[] = clients.map((client) => {
      const latestReport = latestReportByClient.get(client.id) || null;
      const computed = computeClientStatus(client.goal, latestReport);

      return {
        id: client.id,
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        goal: client.goal,
        notes: client.notes,
        created_at: client.created_at,
        manual_status: client.status || "new",
        computed,
      };
    });

    // Compute stats using manual status (what the trainer sets)
    const stats = {
      total: dashboardClients.length,
      onTrack: dashboardClients.filter((c) => c.manual_status === "on_track").length,
      watch: dashboardClients.filter((c) => c.manual_status === "watch").length,
      needsAttention: dashboardClients.filter((c) => c.manual_status === "needs_attention").length,
      new: dashboardClients.filter((c) => c.manual_status === "new").length,
      noData: dashboardClients.filter((c) => c.computed.status === "no_data").length,
    };

    return NextResponse.json({ clients: dashboardClients, stats });
  } catch (error) {
    return handleApiError(error, "fetch client dashboard");
  }
}
