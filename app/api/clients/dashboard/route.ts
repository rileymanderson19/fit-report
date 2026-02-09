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
  status: ClientStatusResult;
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

    // Fetch all active clients
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, first_name, last_name, email, goal, notes, created_at")
      .eq("trainer_id", user.id)
      .eq("active", true)
      .order("first_name", { ascending: true });

    if (clientsError) {
      console.error("[DASHBOARD] Clients query failed:", clientsError);
      throw clientsError;
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({ clients: [], stats: { total: 0, onTrack: 0, watch: 0, needsAttention: 0, noData: 0 } });
    }

    // Fetch the most recent report for each client in one query
    // Uses a lateral join pattern: get all reports for this trainer, then pick latest per client
    const clientIds = clients.map((c) => c.id);

    const { data: reports, error: reportsError } = await supabase
      .from("reports")
      .select("client_id, report_data, date_range_start, date_range_end, created_at")
      .eq("trainer_id", user.id)
      .in("client_id", clientIds)
      .order("created_at", { ascending: false });

    if (reportsError) {
      console.error("[DASHBOARD] Reports query failed:", reportsError);
      throw reportsError;
    }

    // Group reports by client_id, take the most recent one
    const latestReportByClient = new Map<string, any>();
    for (const report of reports || []) {
      if (!latestReportByClient.has(report.client_id)) {
        latestReportByClient.set(report.client_id, report);
      }
    }

    // Compute status for each client
    const dashboardClients: DashboardClient[] = clients.map((client) => {
      const latestReport = latestReportByClient.get(client.id) || null;
      const status = computeClientStatus(client.goal, latestReport);

      return {
        ...client,
        status,
      };
    });

    // Compute stats
    const stats = {
      total: dashboardClients.length,
      onTrack: dashboardClients.filter((c) => c.status.status === "on_track").length,
      watch: dashboardClients.filter((c) => c.status.status === "watch").length,
      needsAttention: dashboardClients.filter((c) => c.status.status === "needs_attention").length,
      noData: dashboardClients.filter((c) => c.status.status === "no_data").length,
    };

    return NextResponse.json({ clients: dashboardClients, stats });
  } catch (error) {
    return handleApiError(error, "fetch client dashboard");
  }
}
