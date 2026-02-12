"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Users, FileText, Settings, Link2, X, ChevronLeft } from "lucide-react";
import ButtonAccount from "./ButtonAccount";

interface SidebarItemProps {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  isActive?: boolean;
  collapsed?: boolean;
  title?: string;
}

const SidebarItem = ({ href, icon, children, isActive = false, collapsed = false, title }: SidebarItemProps) => {
  return (
    <Link
      href={href}
      title={title}
      className={`group relative flex items-center gap-3 py-2.5 rounded-lg transition-all duration-200 text-sm ${
        collapsed ? "px-0 justify-center" : "px-3"
      } ${
        isActive
          ? "bg-white/10 text-white font-medium"
          : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
      }`}
    >
      {/* Active indicator bar */}
      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200 ${
        isActive ? "h-5 bg-blue-400" : "h-0 bg-transparent"
      }`} />

      <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">{icon}</span>

      {/* Text label with fade transition */}
      <span
        className={`whitespace-nowrap transition-all duration-300 ${
          collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
        }`}
      >
        {children}
      </span>
    </Link>
  );
};

export default function Sidebar({
  currentPath = "",
  onClose,
  collapsed = false,
  onToggleCollapse,
}: {
  currentPath?: string;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <aside
      className="relative h-screen bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? 64 : 256 }}
    >
      {/* Edge toggle button — desktop only */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex absolute -right-3 top-7 z-50 w-6 h-6 items-center justify-center rounded-full bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200 shadow-sm"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className="w-3.5 h-3.5 transition-transform duration-300"
            style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
      )}

      {/* Header */}
      <div className="h-[60px] border-b border-gray-800 flex items-center px-5 overflow-hidden">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <span
            className={`font-display font-bold text-white whitespace-nowrap transition-all duration-300 ${
              collapsed ? "text-lg text-center w-full" : "text-xl"
            }`}
          >
            {collapsed ? "F" : "FitReport"}
          </span>
        </Link>

        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden ml-auto p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 space-y-1 transition-all duration-300 ${collapsed ? "px-2" : "px-3"}`}>
        <SidebarItem
          href="/dashboard/clients"
          icon={<Users className="w-4 h-4" />}
          isActive={currentPath.startsWith("/dashboard/clients")}
          collapsed={collapsed}
          title="Clients"
        >
          Clients
        </SidebarItem>

        <SidebarItem
          href="/dashboard/text-reports"
          icon={<FileText className="w-4 h-4" />}
          isActive={currentPath.startsWith("/dashboard/text-reports")}
          collapsed={collapsed}
          title="Text Reports"
        >
          Text Reports
        </SidebarItem>

        <SidebarItem
          href="/dashboard/report-config"
          icon={<Settings className="w-4 h-4" />}
          isActive={currentPath.startsWith("/dashboard/report-config")}
          collapsed={collapsed}
          title="Report Settings"
        >
          Report Settings
        </SidebarItem>

        <SidebarItem
          href="/dashboard/trainerize"
          icon={<Link2 className="w-4 h-4" />}
          isActive={currentPath.startsWith("/dashboard/trainerize")}
          collapsed={collapsed}
          title="Trainerize"
        >
          Trainerize
        </SidebarItem>
      </nav>

      {/* Account */}
      <div className={`mt-auto border-t border-gray-800 transition-all duration-300 ${collapsed ? "p-2" : "p-4"}`}>
        <ButtonAccount collapsed={collapsed} />
      </div>
    </aside>
  );
}
