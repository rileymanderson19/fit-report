import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/libs/supabase/server";
import { createClient } from "@supabase/supabase-js";
import {
  logAuditEvent,
  getRequestMetadata,
} from "@/libs/auditLog";

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
 * POST /api/admin/users/[id]/login-link
 * Generate a magic login link for a user (admin only).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;
  const supabase = createServerClient();

  // Verify admin auth
  const {
    data: { user: adminUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("is_admin, email")
    .eq("id", adminUser.id)
    .single();

  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseAdmin = createAdminClient();

  // Look up the target user's email
  const { data: targetProfile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (profileError || !targetProfile?.email) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  // Generate magic link
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: targetProfile.email,
    options: {
      redirectTo: `${siteUrl}/api/auth/callback?next=/dashboard`,
    },
  });

  if (linkError) {
    console.error("Error generating login link:", linkError);
    return NextResponse.json(
      { error: `Failed to generate login link: ${linkError.message}` },
      { status: 500 }
    );
  }

  const loginLink = linkData?.properties?.action_link;
  if (!loginLink) {
    return NextResponse.json(
      { error: "Link generated but action_link was empty" },
      { status: 500 }
    );
  }

  // Audit log
  const requestMeta = getRequestMetadata(request);
  await logAuditEvent({
    actorId: adminUser.id,
    actorEmail: adminProfile.email || adminUser.email,
    action: "admin.login_link_generated",
    resourceType: "user",
    resourceId: userId,
    details: {
      targetEmail: targetProfile.email,
      targetName: targetProfile.full_name,
    },
    ...requestMeta,
  });

  return NextResponse.json({ loginLink });
}
