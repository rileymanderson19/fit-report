import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import {
  logAuditEvent,
  getRequestMetadata,
  AuditActions,
} from "@/libs/auditLog";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/invites/[id]
 * Get a specific invite (admin only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch the invite
  const { data: invite, error } = await supabase
    .from("invites")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  return NextResponse.json({ invite });
}

/**
 * DELETE /api/admin/invites/[id]
 * Revoke an invite (admin only)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch the invite first to check if it can be revoked
  const { data: invite, error: fetchError } = await supabase
    .from("invites")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot revoke invite with status '${invite.status}'` },
      { status: 400 }
    );
  }

  // Revoke the invite
  const { error: updateError } = await supabase
    .from("invites")
    .update({ status: "revoked" })
    .eq("id", id);

  if (updateError) {
    console.error("Error revoking invite:", updateError);
    return NextResponse.json(
      { error: "Failed to revoke invite" },
      { status: 500 }
    );
  }

  // Log the audit event
  const requestMeta = getRequestMetadata(request);
  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    action: AuditActions.INVITE_REVOKED,
    resourceType: "invite",
    resourceId: id,
    details: {
      invitedEmail: invite.email,
    },
    ...requestMeta,
  });

  return NextResponse.json({ success: true });
}
