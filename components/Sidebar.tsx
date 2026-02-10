import Link from "next/link";
import { ReactNode } from "react";
import { LayoutDashboard, Users, FileText, Settings, Link2, X } from "lucide-react";
import ButtonAccount from "./ButtonAccount";

interface SidebarItemProps {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  isActive?: boolean;
}

const SidebarItem = ({ href, icon, children, isActive = false }: SidebarItemProps) => {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm ${
        isActive
          ? "bg-white/10 text-white font-medium border-l-[3px] border-blue-400 ml-0 pl-[9px]"
          : "text-gray-400 hover:text-gray-200 hover:bg-white/5 border-l-[3px] border-transparent ml-0 pl-[9px]"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
};

export default function Sidebar({
  currentPath = "",
  onClose,
}: {
  currentPath?: string;
  onClose?: () => void;
}) {
  return (
    <aside className="w-64 h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-5 border-b border-gray-800 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <span className="text-xl font-display font-bold text-white">
            FitReport
          </span>
        </Link>
        {/* Close button — only visible on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        <SidebarItem
          href="/dashboard"
          icon={<LayoutDashboard className="w-4 h-4" />}
          isActive={currentPath === "/dashboard" || currentPath === ""}
        >
          Dashboard
        </SidebarItem>

        <SidebarItem
          href="/dashboard/clients"
          icon={<Users className="w-4 h-4" />}
          isActive={currentPath.startsWith("/dashboard/clients")}
        >
          Clients
        </SidebarItem>

        <SidebarItem
          href="/dashboard/text-reports"
          icon={<FileText className="w-4 h-4" />}
          isActive={currentPath.startsWith("/dashboard/text-reports")}
        >
          Text Reports
        </SidebarItem>

        <SidebarItem
          href="/dashboard/report-config"
          icon={<Settings className="w-4 h-4" />}
          isActive={currentPath.startsWith("/dashboard/report-config")}
        >
          Report Settings
        </SidebarItem>

        <SidebarItem
          href="/dashboard/trainerize"
          icon={<Link2 className="w-4 h-4" />}
          isActive={currentPath.startsWith("/dashboard/trainerize")}
        >
          Trainerize
        </SidebarItem>
      </nav>

      <div className="mt-auto border-t border-gray-800 p-4">
        <ButtonAccount />
      </div>
    </aside>
  );
}
