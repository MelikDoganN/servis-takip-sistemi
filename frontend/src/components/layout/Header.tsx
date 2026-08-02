"use client";

import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { navItems } from "@/config/navigation";
import { useSidebar } from "@/hooks/useSidebar";
import { logout } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";

export function Header() {
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const currentPage = navItems.find((item) => item.href === pathname);

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="rounded-xl p-2 text-navy transition hover:bg-slate-100 lg:hidden"
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </button>

          <nav className="min-w-0" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-sm">
              <li className="hidden text-slate-400 sm:inline">Panel</li>
              <li className="hidden text-slate-300 sm:inline">/</li>
              <li className="truncate font-medium text-navy">
                {currentPage?.label ?? "Sayfa"}
              </li>
            </ol>
          </nav>
        </div>

        <div className="flex h-10 items-center gap-2 sm:gap-2.5">
          <GlobalSearch />
          <NotificationBell />

          <div className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 py-1 pl-1 pr-3 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-xs font-semibold text-white">
              ST
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-navy">Oturum</p>
              <p className="text-[10px] text-slate-400">Yönetici</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="h-10 gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Çıkış</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
