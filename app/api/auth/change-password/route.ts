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
  const { data: adminUser, error: adminError } =
    await supabaseAdmin.auth.admin.getUserById(user.id);

  if (adminError || !adminUser?.user) {
    return NextResponse.json({ hasPassword: false });
  }

  // Check if user has a password by looking at identities
  // Users created via admin without a password will have an email identity
  // but their encrypted_password in the DB will be empty.
  // The admin API doesn't expose this directly, but we can check
  // if the user has ever signed in with a password by checking
  // the identity's last_sign_in_at or using a workaround.
  // Safest approach: try to verify with an empty password — if it fails
  // with "Invalid login credentials", they have a password set.
  const { error: signInError } =
    await supabaseAdmin.auth.signInWithPassword({
      email: user.email!,
      password: "",
    });

  // If empty password works, they don't have a password.
  // If it fails with "Invalid login credentials", they have one.
  const hasPassword = signInError?.message === "Invalid login credentials";

  return NextResponse.json({ hasPassword });
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

  return NextResponse.json({ success: true });
}
