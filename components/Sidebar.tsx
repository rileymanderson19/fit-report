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
      className={`flex items-center px-6 py-3 rounded-md transition-colors ${
        isActive
          ? "bg-primary text-primary-content font-medium"
          : "text-base-content hover:bg-base-300"
      }`}
    >
      {children}
    </Link>
  );
};

export default function Sidebar({ currentPath = "" }: { currentPath?: string }) {
  return (
    <aside className="w-64 h-screen bg-base-200 border-r border-base-300 flex flex-col shadow-lg relative">
      <div className="p-6 border-b border-base-300 bg-base-200">
        <Link href="/dashboard" className="flex items-center text-xl font-bold text-primary">
          <span>FitReport</span>
        </Link>
      </div>
      
      <div className="flex-1 py-6 space-y-1">
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
      
      <div className="mt-auto border-t border-base-300 p-6 bg-base-200 relative z-[100]">
        <ButtonAccount />
      </div>
    </aside>
  );
} 