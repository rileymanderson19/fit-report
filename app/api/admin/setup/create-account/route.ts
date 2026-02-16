import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/libs/supabase/server";
import { createClient } from "@supabase/supabase-js";
import {
  logAuditEvent,
  getRequestMetadata,
  AuditActions,
} from "@/libs/auditLog";
import { cleanupUserReferences } from "@/libs/adminUserCleanup";
import { sendEmail } from "@/libs/resend";

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
 * POST /api/admin/setup/create-account
 * Create a complete user account with Trainerize config and imported clients (admin only).
 */
export async function POST(request: NextRequest) {
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

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, firstName, lastName, trainerize, clients, sendLoginLink = true } = body;

  // Validate required fields
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }
  if (!firstName || typeof firstName !== "string") {
    return NextResponse.json({ error: "First name is required" }, { status: 400 });
  }
  if (!trainerize?.username || !trainerize?.password || !trainerize?.trainerId) {
    return NextResponse.json(
      { error: "Trainerize credentials (username, password, trainerId) are required" },
      { status: 400 }
    );
  }

  const supabaseAdmin = createAdminClient();
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  if (existingProfile) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  // Step 1: Create auth user
  let newUserId: string;
  {
    const createPayload = {
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: {
        full_name: `${firstName} ${lastName || ""}`.trim(),
      },
    };

    let { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser(createPayload);

    // Handle orphaned auth user (exists in auth.users but not in profiles)
    if (createUserError?.message?.includes("already been registered")) {
      const listResult = await supabaseAdmin.auth.admin.listUsers();
      const orphanedUser = listResult.data?.users?.find((u: { email?: string }) => u.email === normalizedEmail);

      if (orphanedUser) {
        // Clean up ALL FK references before deleting the orphaned user
        const { errors: cleanupErrors } = await cleanupUserReferences(supabaseAdmin, orphanedUser.id);
        if (cleanupErrors.length > 0) {
          console.warn("Cleanup errors for orphaned user:", cleanupErrors);
        }

        const { error: deleteOrphanError } = await supabaseAdmin.auth.admin.deleteUser(orphanedUser.id);
        if (deleteOrphanError) {
          console.error("Failed to delete orphaned user after cleanup:", deleteOrphanError);
          return NextResponse.json(
            { error: `Failed to clean up existing account for this email. Please try again or contact support.` },
            { status: 500 }
          );
        }

        // Retry creation
        const retry = await supabaseAdmin.auth.admin.createUser(createPayload);
        authData = retry.data;
        createUserError = retry.error;
      }
    }

    if (createUserError || !authData?.user) {
      console.error("Error creating auth user:", createUserError);
      return NextResponse.json(
        { error: createUserError?.message || "Failed to create user account" },
        { status: 500 }
      );
    }

    newUserId = authData.user.id;
  }

  // Step 2: Update profile with all data
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: `${firstName} ${lastName || ""}`.trim(),
      email: normalizedEmail,
      trainerize_username: trainerize.username,
      trainerize_password: trainerize.password,
      trainerize_id: trainerize.trainerId,
      onboarding_status: "completed",
      onboarding_completed_at: new Date().toISOString(),
      invited_by: adminUser.id,
      invited_at: new Date().toISOString(),
    })
    .eq("id", newUserId);

  if (profileError) {
    console.error("Error updating profile:", profileError);
    // User was created but profile update failed — not ideal but recoverable
    return NextResponse.json(
      { error: "User created but failed to configure profile: " + profileError.message },
      { status: 500 }
    );
  }

  // Step 3: Import clients if any were selected
  let importedClientCount = 0;
  if (Array.isArray(clients) && clients.length > 0) {
    const clientsToInsert = clients.map((client: { id: string; firstName: string; lastName: string; email?: string }) => ({
      trainer_id: newUserId,
      trainerize_id: client.id,
      first_name: client.firstName,
      last_name: client.lastName,
      email: client.email || null,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: importError } = await supabaseAdmin
      .from("clients")
      .upsert(clientsToInsert, {
        onConflict: "trainer_id,trainerize_id",
        ignoreDuplicates: false,
      });

    if (importError) {
      console.error("Error importing clients:", importError);
      // Don't fail the whole operation — account is created, clients can be re-imported
    } else {
      importedClientCount = clients.length;
    }
  }

  // Step 4: Generate login link if requested
  let loginLink: string | undefined;
  let loginLinkError: string | undefined;
  if (sendLoginLink) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: {
        redirectTo: `${siteUrl}/api/auth/callback?next=/dashboard`,
      },
    });

    if (linkError) {
      console.error("Error generating login link:", linkError);
      loginLinkError = linkError.message;
    } else {
      loginLink = linkData?.properties?.action_link;
      if (!loginLink) {
        loginLinkError = "Link generated but action_link was empty";
      }
    }

    // Send welcome email with login link
    if (loginLink) {
      try {
        await sendEmail({
          to: normalizedEmail,
          subject: "Welcome to FitReport — Your Account is Ready",
          text: `Hi ${firstName},\n\nYour FitReport coach account has been created! Click the link below to log in:\n\n${loginLink}\n\nThis link will expire shortly. If it expires, you can request a new one from the login page.\n\nWelcome aboard!\n- The FitReport Team`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563EB; font-size: 24px; margin: 0;">Welcome to FitReport</h1>
              </div>
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6;">Your FitReport coach account has been created! Click the button below to log in and get started:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginLink}" style="background-color: #2563EB; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">Log In to FitReport</a>
              </div>
              <p style="color: #64748b; font-size: 14px; line-height: 1.6;">This link will expire shortly. If it expires, you can request a new magic link from the <a href="${siteUrl}/signin" style="color: #2563EB;">login page</a>.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
              <p style="color: #64748b; font-size: 14px; text-align: center;">Welcome aboard!<br/>The FitReport Team</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the request — the login link is still returned for the admin to share manually
      }
    }
  }

  // Step 5: Audit log
  const requestMeta = getRequestMetadata(request);
  await logAuditEvent({
    actorId: adminUser.id,
    actorEmail: adminProfile.email || adminUser.email,
    action: AuditActions.ADMIN_SETUP_ACCOUNT_CREATED,
    resourceType: "user",
    resourceId: newUserId,
    details: {
      coachEmail: normalizedEmail,
      coachName: `${firstName} ${lastName || ""}`.trim(),
      trainerId: trainerize.trainerId,
      clientsImported: importedClientCount,
      loginLinkSent: !!loginLink,
    },
    ...requestMeta,
  });

  return NextResponse.json({
    userId: newUserId,
    email: normalizedEmail,
    clientsImported: importedClientCount,
    loginLink,
    loginLinkError,
  });
}
