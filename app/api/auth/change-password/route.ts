import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/libs/supabase/server";
import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * GET /api/auth/change-password
 * Check if the current user has a password set.
 */
export async function GET() {
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();

  // Check the password_set column in the profiles table
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("password_set")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile for password check:", profileError);
    return NextResponse.json({ hasPassword: false });
  }

  return NextResponse.json({ hasPassword: profile?.password_set ?? false });
}

/**
 * POST /api/auth/change-password
 * Change the current user's password. Requires old password if one is set.
 */
export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { currentPassword, newPassword } = body;

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const supabaseAdmin = createAdminClient();

  // If current password is provided, verify it
  if (currentPassword) {
    const { error: verifyError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

    if (verifyError) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }
  }

  // Update the password
  const { error: updateError } =
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

  if (updateError) {
    console.error("Error updating password:", updateError);
    return NextResponse.json(
      { error: updateError.message || "Failed to update password" },
      { status: 500 }
    );
  }

  // Mark password as set in the profile
  const { error: profileUpdateError } = await supabaseAdmin
    .from("profiles")
    .update({ password_set: true })
    .eq("id", user.id);

  if (profileUpdateError) {
    console.error("Error updating password_set flag:", profileUpdateError);
  }

  return NextResponse.json({ success: true });
}
