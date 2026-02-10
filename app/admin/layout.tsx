import React from "react";
import { createClient } from "@/libs/supabase/server";
import { redirect } from "next/navigation";
import config from "@/config";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(config.auth.loginUrl);
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, email")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    // Not an admin - redirect to dashboard
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
                ← Back to Dashboard
              </Link>
              <div className="h-6 w-px bg-gray-200" />
              <h1 className="text-xl font-display font-bold">
                <span className="text-blue-600">Admin</span> Panel
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {profile.email || user.email}
              </span>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Admin</div>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex gap-6">
            <Link
              href="/admin"
              className="py-3 px-1 border-b-2 border-transparent hover:border-blue-600 text-gray-500 hover:text-gray-900 transition-colors"
            >
              Invites
            </Link>
            <Link
              href="/admin/users"
              className="py-3 px-1 border-b-2 border-transparent hover:border-blue-600 text-gray-500 hover:text-gray-900 transition-colors"
            >
              Users
            </Link>
            <Link
              href="/admin/audit"
              className="py-3 px-1 border-b-2 border-transparent hover:border-blue-600 text-gray-500 hover:text-gray-900 transition-colors"
            >
              Audit Log
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
