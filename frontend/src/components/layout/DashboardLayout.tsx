"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SidebarProvider, useSidebar } from "@/hooks/useSidebar";
import { cn } from "@/lib/utils";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useSidebar();

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />

      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={close} />
          <div
            className={cn(
              "absolute inset-y-0 left-0 shadow-elevated transition-transform duration-300",
              isOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <Header />
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="page-shell">{children}</div>
        </main>
      </div>
    </div>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}
