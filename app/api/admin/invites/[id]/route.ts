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

  // Fetch the invite
  const { data: invite, error: fetchError } = await supabase
    .from("invites")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const permanent = request.nextUrl.searchParams.get("permanent") === "true";

  if (permanent) {
    // Permanently delete the invite record
    const { error: deleteError } = await supabase
      .from("invites")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting invite:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete invite" },
        { status: 500 }
      );
    }

    const requestMeta = getRequestMetadata(request);
    await logAuditEvent({
      actorId: user.id,
      actorEmail: user.email,
      action: AuditActions.INVITE_REVOKED,
      resourceType: "invite",
      resourceId: id,
      details: {
        invitedEmail: invite.email,
        action: "deleted",
      },
      ...requestMeta,
    });

    return NextResponse.json({ success: true });
  }

  // Revoke — only for pending invites
  if (invite.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot revoke invite with status '${invite.status}'` },
      { status: 400 }
    );
  }

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
