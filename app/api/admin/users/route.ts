import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/libs/supabase/server";
import { createClient } from "@supabase/supabase-js";

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
 * GET /api/admin/users
 * List all user profiles (admin only).
 */
export async function GET() {
  const supabase = createServerClient();

  // Verify admin auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseAdmin = createAdminClient();

  // Fetch all profiles (using admin client to bypass RLS)
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, email, full_name, is_admin, onboarding_status, onboarding_completed_at, invited_at, invited_by, trainerize_id, updated_at"
    )
    .order("invited_at", { ascending: false, nullsFirst: false });

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }

  // Count clients per trainer
  const { data: clientRows, error: clientsError } = await supabaseAdmin
    .from("clients")
    .select("trainer_id")
    .eq("active", true);

  const clientCounts: Record<string, number> = {};
  if (!clientsError && clientRows) {
    for (const row of clientRows) {
      clientCounts[row.trainer_id] = (clientCounts[row.trainer_id] || 0) + 1;
    }
  }

  // Merge client counts into profiles
  const users = (profiles || []).map((p) => ({
    ...p,
    client_count: clientCounts[p.id] || 0,
  }));

  return NextResponse.json({ users });
}
