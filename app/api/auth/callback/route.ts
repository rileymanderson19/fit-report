import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import config from "@/config";
import { isConciergeOnboardingEnabled } from "@/libs/featureFlags";

export const dynamic = "force-dynamic";

// Create admin client to bypass RLS for invite check
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// This route is called after a successful login. It exchanges the code for a session and redirects to the callback URL (see config.js).
export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  let redirectTo = config.auth.callbackUrl;

  if (code) {
    const supabase = createClient();

    // Exchange the code for a session
    const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code);

    console.log("Auth callback - Session exchange result:", { user: user?.id, authError });

    if (user) {
      // Check if profile exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, onboarding_status')
        .eq('id', user.id)
        .single();

      console.log("Auth callback - Profile check result:", { existingProfile, profileError });

      if (!existingProfile) {
        // Create profile if it doesn't exist
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              full_name: user.user_metadata.full_name || user.email?.split('@')[0],
              email: user.email,
              avatar_url: user.user_metadata.avatar_url,
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        console.log("Auth callback - Profile creation result:", { insertError });
      }

      // Check if user came from an invite and should go to onboarding
      if (isConciergeOnboardingEnabled() && user.email) {
        const adminClient = getAdminClient();

        // Check if there's an accepted invite for this user
        const { data: invite } = await adminClient
          .from("invites")
          .select("id, invited_by, created_at")
          .eq("email", user.email.toLowerCase())
          .eq("status", "accepted")
          .single();

        if (invite) {
          // User came from invite - update profile and redirect to onboarding
          await adminClient
            .from("profiles")
            .update({
              onboarding_status: "invited",
              invited_at: invite.created_at,
              invited_by: invite.invited_by,
            })
            .eq("id", user.id);

          redirectTo = "/onboarding";
          console.log("Auth callback - Redirecting invited user to onboarding");
        }
      }
    }
  }

  // Use 'next' param if provided, otherwise use determined redirect
  const finalRedirect = next || redirectTo;
  return NextResponse.redirect(requestUrl.origin + finalRedirect);
}
