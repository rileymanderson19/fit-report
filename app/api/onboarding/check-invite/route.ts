import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/libs/supabase/server";
import { createClient } from "@supabase/supabase-js";

// Create admin client to bypass RLS
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
 * GET /api/onboarding/check-invite
 * Check if the current user has an accepted invite and update their profile
 */
export async function GET() {
  const supabaseServer = createServerClient();
  const supabaseAdmin = createAdminClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabaseServer.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("onboarding_status")
    .eq("id", user.id)
    .single();

  const currentStatus = profile?.onboarding_status || "pending";

  // If already past pending, return current status
  if (currentStatus !== "pending") {
    return NextResponse.json({
      status: currentStatus,
      hasInvite: currentStatus !== "pending",
    });
  }

  // Check for accepted invite
  if (user.email) {
    const { data: invite } = await supabaseAdmin
      .from("invites")
      .select("id, invited_by, created_at")
      .eq("email", user.email.toLowerCase())
      .eq("status", "accepted")
      .single();

    if (invite) {
      // Update user's profile to 'invited' status
      await supabaseAdmin
        .from("profiles")
        .update({
          onboarding_status: "invited",
          invited_at: invite.created_at,
          invited_by: invite.invited_by,
        })
        .eq("id", user.id);

      return NextResponse.json({
        status: "invited",
        hasInvite: true,
      });
    }
  }

  // No invite found
  return NextResponse.json({
    status: "pending",
    hasInvite: false,
  });
}
