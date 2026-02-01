import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/libs/supabase/server";
import { createClient } from "@supabase/supabase-js";
import {
  logAuditEvent,
  getRequestMetadata,
  AuditActions,
} from "@/libs/auditLog";

// Create admin client for user creation
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
 * POST /api/onboarding/accept-invite
 * Accept an invite token and create/link user account
 */
export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { token } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const supabaseServer = createServerClient();
  const supabaseAdmin = createAdminClient();

  // Find the invite by token
  const { data: invite, error: inviteError } = await supabaseAdmin
    .from("invites")
    .select("*")
    .eq("token", token)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json(
      { error: "Invalid or expired invite token" },
      { status: 400 }
    );
  }

  // Check invite status
  if (invite.status !== "pending") {
    return NextResponse.json(
      { error: `This invite has already been ${invite.status}` },
      { status: 400 }
    );
  }

  // Check if invite has expired
  if (new Date(invite.expires_at) < new Date()) {
    // Mark invite as expired
    await supabaseAdmin
      .from("invites")
      .update({ status: "expired" })
      .eq("id", invite.id);

    return NextResponse.json(
      { error: "This invite has expired" },
      { status: 400 }
    );
  }

  // Check if current user is authenticated
  const {
    data: { user: currentUser },
  } = await supabaseServer.auth.getUser();

  let userId: string;
  let isNewUser = false;

  if (currentUser) {
    // User is already logged in - link invite to their account
    userId = currentUser.id;

    // Verify email matches (optional - could allow different emails)
    if (
      currentUser.email?.toLowerCase() !== invite.email.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error:
            "Your account email does not match the invited email. Please log out and sign up with the invited email address.",
        },
        { status: 400 }
      );
    }
  } else {
    // No user logged in - create new user via magic link
    // The actual user creation will happen when they click the magic link
    // For now, return the magic link info

    // Send magic link via Supabase Auth (uses Supabase's built-in email)
    // Redirect through auth callback to ensure session is established properly
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
      email: invite.email,
      options: {
        emailRedirectTo: `${siteUrl}/api/auth/callback?next=/onboarding`,
      },
    });

    if (otpError) {
      console.error("Error sending magic link:", otpError);
      return NextResponse.json(
        { error: "Failed to send login link" },
        { status: 500 }
      );
    }

    // Mark invite as accepted (pending user creation via magic link)
    await supabaseAdmin
      .from("invites")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    // Log the audit event
    const requestMeta = getRequestMetadata(request);
    await logAuditEvent({
      actorEmail: invite.email,
      action: AuditActions.INVITE_ACCEPTED,
      resourceType: "invite",
      resourceId: invite.id,
      details: {
        email: invite.email,
        via: "magic_link",
      },
      ...requestMeta,
    });

    // Return success
    return NextResponse.json({
      success: true,
      message: "Check your email for a login link",
    });
  }

  // User is logged in and email matches - update their profile
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      onboarding_status: "invited",
      invited_at: invite.created_at,
      invited_by: invite.invited_by,
    })
    .eq("id", userId);

  if (profileError) {
    console.error("Error updating profile:", profileError);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  // Mark invite as accepted
  const { error: acceptError } = await supabaseAdmin
    .from("invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
    })
    .eq("id", invite.id);

  if (acceptError) {
    console.error("Error accepting invite:", acceptError);
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }

  // Log the audit event
  const requestMeta = getRequestMetadata(request);
  await logAuditEvent({
    actorId: userId,
    actorEmail: invite.email,
    action: AuditActions.INVITE_ACCEPTED,
    resourceType: "invite",
    resourceId: invite.id,
    details: {
      email: invite.email,
      isNewUser,
    },
    ...requestMeta,
  });

  return NextResponse.json({
    success: true,
    redirectTo: "/onboarding",
  });
}
