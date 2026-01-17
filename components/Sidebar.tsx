import Link from "next/link";
import { ReactNode } from "react";
import ButtonAccount from "./ButtonAccount";

interface SidebarItemProps {
  href: string;
  children: ReactNode;
  isActive?: boolean;
}

const SidebarItem = ({ href, children, isActive = false }: SidebarItemProps) => {
  return (
    <Link
      href={href}
      className={`relative flex items-center px-6 py-3 rounded-lg transition-all duration-200 group ${
        isActive
          ? "bg-gradient-to-r from-primary-start to-accent-purple text-white font-medium shadow-lg"
          : "text-gray-300 hover:text-white hover:bg-bg-elevated"
      }`}
    >
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary-start to-accent-purple opacity-20 blur-sm rounded-lg -z-10" />
      )}
      {children}
    </Link>
  );
};

export default function Sidebar({ currentPath = "" }: { currentPath?: string }) {
  return (
    <aside className="w-64 h-screen bg-gradient-to-b from-bg-secondary to-bg-tertiary border-r border-white/10 flex flex-col shadow-2xl relative">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent-purple/5 to-transparent pointer-events-none" />

      <div className="relative z-10 p-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <span className="text-2xl font-display font-bold gradient-text">FitReport</span>
        </Link>
      </div>

      <div className="relative z-10 flex-1 py-6 px-3 space-y-2">
        <SidebarItem
          href="/dashboard/clients"
          isActive={currentPath.startsWith("/dashboard/clients")}
        >
          Clients
        </SidebarItem>

        <SidebarItem
          href="/dashboard/reports"
          isActive={currentPath.startsWith("/dashboard/reports")}
        >
          Reports
        </SidebarItem>

        <SidebarItem
          href="/dashboard/text-reports"
          isActive={currentPath.startsWith("/dashboard/text-reports")}
        >
          Text Reports
        </SidebarItem>

        <SidebarItem
          href="/dashboard/report-config"
          isActive={currentPath.startsWith("/dashboard/report-config")}
        >
          Report Settings
        </SidebarItem>

        <SidebarItem
          href="/dashboard/trainerize"
          isActive={currentPath.startsWith("/dashboard/trainerize")}
        >
          Trainerize Configuration
        </SidebarItem>
      </div>

      <div className="relative z-10 mt-auto border-t border-white/10 p-6">
        <ButtonAccount />
      </div>
    </aside>
  );
} 