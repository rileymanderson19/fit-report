import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import config from "@/config";
import Sidebar from "@/components/Sidebar";
import { headers } from "next/headers";
import { isConciergeOnboardingEnabled } from "@/libs/featureFlags";

// This is a server-side component to ensure the user is logged in.
// If not, it will redirect to the login page.
// It's applied to all subpages of /dashboard in /app/dashboard/*** pages
// You can also add custom static UI elements like a Navbar, Sidebar, Footer, etc..
// See https://shipfa.st/docs/tutorials/private-page
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
    <div className="flex min-h-screen bg-gradient-to-b from-bg-primary via-bg-secondary to-black relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent-purple/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent-violet/5 rounded-full blur-[150px]" />
      </div>

      <div className="fixed inset-y-0 left-0 z-50">
        <Sidebar currentPath={pathname} />
      </div>
      <div className="relative z-10 flex-1 ml-64 p-8 text-white">
        {children}
      </div>
    </div>
  );
}
