import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/libs/supabase/server";
import { createClient } from "@supabase/supabase-js";
import {
  logAuditEvent,
  getRequestMetadata,
} from "@/libs/auditLog";
import { cleanupUserReferences } from "@/libs/adminUserCleanup";

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
 * DELETE /api/admin/users/[id]
 * Delete a user account and all related data (admin only).
 */
export async function DELETE(
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

  // Prevent self-deletion
  if (userId === adminUser.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  const supabaseAdmin = createAdminClient();

  // Look up the target user
  const { data: targetProfile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  if (profileError || !targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Clean up all FK references before deleting auth user
  const { errors: cleanupErrors } = await cleanupUserReferences(supabaseAdmin, userId);
  if (cleanupErrors.length > 0) {
    console.warn("Non-fatal cleanup errors during user deletion:", cleanupErrors);
  }

  // Delete from auth.users (cascades to profiles)
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error("Error deleting user:", deleteError);
    return NextResponse.json(
      { error: `Failed to delete user: ${deleteError.message}` },
      { status: 500 }
    );
  }

  // Audit log
  const requestMeta = getRequestMetadata(request);
  await logAuditEvent({
    actorId: adminUser.id,
    actorEmail: adminProfile.email || adminUser.email,
    action: "admin.user_deleted",
    resourceType: "user",
    resourceId: userId,
    details: {
      deletedEmail: targetProfile.email,
      deletedName: targetProfile.full_name,
    },
    ...requestMeta,
  });

  return NextResponse.json({ success: true });
}
