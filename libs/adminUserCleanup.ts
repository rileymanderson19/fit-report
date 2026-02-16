import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Clean up all database references to a user ID before deleting from auth.users.
 *
 * Tables with ON DELETE CASCADE (auto-cleaned by Postgres):
 *   - profiles.id
 *   - reports.trainer_id
 *   - report_cache.trainer_id
 *   - coach_profiles.trainer_id
 *   - client_tasks.trainer_id
 *   - report_deliveries.trainer_id
 *   - report_configurations.trainer_id
 *   - client_progress_photos.trainer_id
 *
 * Tables WITHOUT ON DELETE CASCADE (cleaned here):
 *   - clients.trainer_id
 *   - invites.invited_by (NOT NULL — must delete, not nullify)
 *   - invites.accepted_by
 *   - profiles.invited_by
 *   - audit_logs.actor_id
 */
export async function cleanupUserReferences(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<{ errors: string[] }> {
  const errors: string[] = [];

  // 1. Delete user's clients
  const { error: clientsErr } = await supabaseAdmin
    .from("clients")
    .delete()
    .eq("trainer_id", userId);
  if (clientsErr) errors.push(`clients: ${clientsErr.message}`);

  // 2. Delete invites created by this user (invited_by is NOT NULL, can't nullify)
  const { error: invitedByErr } = await supabaseAdmin
    .from("invites")
    .delete()
    .eq("invited_by", userId);
  if (invitedByErr) errors.push(`invites.invited_by: ${invitedByErr.message}`);

  // 3. Nullify invites.accepted_by references
  const { error: acceptedByErr } = await supabaseAdmin
    .from("invites")
    .update({ accepted_by: null })
    .eq("accepted_by", userId);
  if (acceptedByErr) errors.push(`invites.accepted_by: ${acceptedByErr.message}`);

  // 4. Revoke any pending invites FOR this user's email
  const { data: userProfile } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (userProfile?.email) {
    const { error: inviteEmailErr } = await supabaseAdmin
      .from("invites")
      .update({ status: "revoked" })
      .eq("email", userProfile.email)
      .eq("status", "pending");
    if (inviteEmailErr) errors.push(`invites by email: ${inviteEmailErr.message}`);
  }

  // 5. Nullify profiles.invited_by where other users were invited by this user
  const { error: profileInvitedByErr } = await supabaseAdmin
    .from("profiles")
    .update({ invited_by: null })
    .eq("invited_by", userId);
  if (profileInvitedByErr) errors.push(`profiles.invited_by: ${profileInvitedByErr.message}`);

  // 6. Nullify audit_logs.actor_id (preserve audit trail, just unlink the user)
  const { error: auditErr } = await supabaseAdmin
    .from("audit_logs")
    .update({ actor_id: null })
    .eq("actor_id", userId);
  if (auditErr) errors.push(`audit_logs: ${auditErr.message}`);

  return { errors };
}
