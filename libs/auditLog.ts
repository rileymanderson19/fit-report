import { createClient } from "@/libs/supabase/server";

export interface AuditLogParams {
  actorId?: string;
  actorEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event to the audit_logs table
 *
 * @example
 * await logAuditEvent({
 *   actorId: user.id,
 *   actorEmail: user.email,
 *   action: 'invite.created',
 *   resourceType: 'invite',
 *   resourceId: invite.id,
 *   details: { email: invite.email },
 *   request
 * });
 */
export async function logAuditEvent({
  actorId,
  actorEmail,
  action,
  resourceType,
  resourceId,
  details = {},
  ipAddress,
  userAgent,
}: AuditLogParams): Promise<void> {
  try {
    const supabase = createClient();

    await supabase.from("audit_logs").insert({
      actor_id: actorId,
      actor_email: actorEmail,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main flow
    console.error("Failed to log audit event:", error, {
      action,
      resourceType,
      resourceId,
    });
  }
}

/**
 * Extract request metadata for audit logging
 */
export function getRequestMetadata(request: Request): {
  ipAddress: string | undefined;
  userAgent: string | undefined;
} {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      undefined,
    userAgent: request.headers.get("user-agent") || undefined,
  };
}

// Common audit actions
export const AuditActions = {
  // Invite actions
  INVITE_CREATED: "invite.created",
  INVITE_ACCEPTED: "invite.accepted",
  INVITE_REVOKED: "invite.revoked",
  INVITE_RESENT: "invite.resent",
  INVITE_EXPIRED: "invite.expired",

  // User actions
  USER_CREATED: "user.created",
  USER_ONBOARDING_STARTED: "user.onboarding_started",
  USER_ONBOARDING_COMPLETED: "user.onboarding_completed",

  // Admin actions
  ADMIN_GRANTED: "admin.granted",
  ADMIN_REVOKED: "admin.revoked",

  // Trainerize actions
  TRAINERIZE_CREDENTIALS_SAVED: "trainerize.credentials_saved",
  TRAINERIZE_CLIENTS_IMPORTED: "trainerize.clients_imported",

  // Report actions
  REPORT_GENERATED: "report.generated",
  REPORT_SENT: "report.sent",
  REPORT_SCHEDULED: "report.scheduled",
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];
