import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import config from "@/config";
import DashboardShell from "@/components/DashboardShell";
import { headers } from "next/headers";
import { isConciergeOnboardingEnabled } from "@/libs/featureFlags";

// This is a server-side component to ensure the user is logged in.
// If not, it will redirect to the login page.
export default async function LayoutPrivate({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(config.auth.loginUrl);
  }

  // Check onboarding status when concierge mode is enabled
  if (isConciergeOnboardingEnabled()) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_status")
      .eq("id", user.id)
      .single();

    // Redirect to onboarding if not completed (and user has been invited)
    if (
      profile?.onboarding_status &&
      profile.onboarding_status !== "pending" &&
      profile.onboarding_status !== "completed"
    ) {
      redirect("/onboarding");
    }
  }

  // Get the current path to highlight the active sidebar item
  const headersList = headers();
  const pathname = headersList.get("x-pathname") || "";

  return (
    <DashboardShell currentPath={pathname}>
      {children}
    </DashboardShell>
  );
}
