import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import crypto from "crypto";
import {
  logAuditEvent,
  getRequestMetadata,
  AuditActions,
} from "@/libs/auditLog";

// Default invite expiration: 48 hours
const INVITE_EXPIRATION_HOURS = 48;

/**
 * GET /api/admin/invites
 * List all invites (admin only)
 */
export async function GET() {
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

  // Fetch all invites with inviter info
  const { data: invites, error } = await supabase
    .from("invites")
    .select(
      `
      *,
      inviter:profiles!invites_invited_by_fkey(email)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 }
    );
  }

  return NextResponse.json({ invites });
}

/**
 * POST /api/admin/invites
 * Create a new invite (admin only)
 */
export async function POST(request: NextRequest) {
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

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, metadata = {} } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 }
    );
  }

  // Check for existing pending invite for this email
  const { data: existingInvite } = await supabase
    .from("invites")
    .select("id, status")
    .eq("email", email.toLowerCase())
    .eq("status", "pending")
    .single();

  if (existingInvite) {
    return NextResponse.json(
      { error: "A pending invite already exists for this email" },
      { status: 409 }
    );
  }

  // Check if user already exists
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .single();

  if (existingUser) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  // Generate secure random token
  const token = crypto.randomBytes(32).toString("hex");

  // Calculate expiration
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + INVITE_EXPIRATION_HOURS);

  // Create the invite
  const { data: invite, error: insertError } = await supabase
    .from("invites")
    .insert({
      email: email.toLowerCase(),
      token,
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
      metadata,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error creating invite:", insertError);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }

  // Log the audit event
  const requestMeta = getRequestMetadata(request);
  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    action: AuditActions.INVITE_CREATED,
    resourceType: "invite",
    resourceId: invite.id,
    details: {
      invitedEmail: email.toLowerCase(),
      expiresAt: expiresAt.toISOString(),
      metadata,
    },
    ...requestMeta,
  });

  // Generate invite URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/onboarding/accept?token=${token}`;

  // TODO: Send email with invite link
  // For now, return the URL in the response for manual sharing
  console.log(`[Invite] Created invite for ${email}: ${inviteUrl}`);

  return NextResponse.json({
    invite: {
      id: invite.id,
      email: invite.email,
      status: invite.status,
      expires_at: invite.expires_at,
      created_at: invite.created_at,
    },
    inviteUrl,
  });
}
