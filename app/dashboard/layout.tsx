import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import config from "@/config";
import Sidebar from "@/components/Sidebar";
import { headers } from "next/headers";

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

  // Get the current path to highlight the active sidebar item
  const headersList = headers();
  const pathname = headersList.get("x-pathname") || "";

  return (
    <div className="flex min-h-screen">
      <Sidebar currentPath={pathname} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
