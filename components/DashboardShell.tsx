"use client";

import { ReactNode, useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export default function DashboardShell({
  children,
  currentPath = "",
}: {
  children: ReactNode;
  currentPath?: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 relative">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 lg:hidden bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
        <Link href="/dashboard" className="font-display font-bold text-gray-900">
          FitReport
        </Link>
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          currentPath={currentPath}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 lg:ml-64 pt-14 lg:pt-0 p-4 sm:p-6 lg:p-8 text-gray-900">
        {children}
      </div>
    </div>
  );
}
