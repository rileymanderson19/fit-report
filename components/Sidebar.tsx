import Link from "next/link";
import { ReactNode } from "react";

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
    <aside className="w-64 h-screen bg-base-200 border-r border-base-300 flex flex-col shadow-lg">
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
          href="/dashboard/trainerize" 
          isActive={currentPath.startsWith("/dashboard/trainerize")}
        >
          Trainerize Configuration
        </SidebarItem>
      </div>
      
      <div className="mt-auto border-t border-base-300 p-6 bg-base-200">
        <Link href="/dashboard/account" className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-content rounded-full">
            A
          </div>
          <div>
            <div className="font-medium text-base-content">Account</div>
            <div className="text-xs text-base-content/60">Free Plan</div>
          </div>
          <div className="ml-auto text-base-content/60">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </Link>
      </div>
    </aside>
  );
} 