import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import crypto from "crypto";
import {
  logAuditEvent,
  getRequestMetadata,
  AuditActions,
} from "@/libs/auditLog";
import { sendEmail } from "@/libs/resend";

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

  // Fetch all invites
  const { data: invites, error } = await supabase
    .from("invites")
    .select("*")
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

  // Send invite email
  let emailSent = false;
  try {
    const coachName = metadata?.coachName;
    const greeting = coachName ? `Hi ${coachName},` : "Hi,";

    await sendEmail({
      to: email.toLowerCase(),
      subject: "You're Invited to FitReport",
      text: `${greeting}\n\nYou've been invited to join FitReport as a coach!\n\nClick the link below to accept your invitation and set up your account:\n\n${inviteUrl}\n\nThis invitation expires in ${INVITE_EXPIRATION_HOURS} hours.\n\nIf you have any questions, reply to this email.\n\n- The FitReport Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563EB; font-size: 24px; margin: 0;">You're Invited to FitReport</h1>
          </div>
          <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6;">${greeting}</p>
          <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6;">You've been invited to join FitReport as a coach! Click the button below to accept your invitation and set up your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #2563EB; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">Accept Invitation</a>
          </div>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">This invitation expires in ${INVITE_EXPIRATION_HOURS} hours.</p>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">If you have any questions, simply reply to this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          <p style="color: #64748b; font-size: 14px; text-align: center;">The FitReport Team</p>
        </div>
      `,
      replyTo: "riley@rileymanderson.com",
    });
    emailSent = true;
  } catch (emailError) {
    console.error("Failed to send invite email:", emailError);
    // Don't fail the request — the URL is still returned for manual sharing
  }

  return NextResponse.json({
    invite: {
      id: invite.id,
      email: invite.email,
      status: invite.status,
      expires_at: invite.expires_at,
      created_at: invite.created_at,
    },
    inviteUrl,
    emailSent,
  });
}
