"use client";

import { usePathname } from "next/navigation";
import { Bell, LogOut, Menu, Search } from "lucide-react";
import { navItems } from "@/config/navigation";
import { useSidebar } from "@/hooks/useSidebar";
import { logout } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export function Header() {
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const currentPage = navItems.find((item) => item.href === pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <div className="mb-0.5 hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
              <span>Panel</span>
              <span>/</span>
              <span className="text-slate-600">{currentPage?.label ?? "Sayfa"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-primary-600 sm:inline-flex">{currentPage?.icon}</span>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                  {currentPage?.label ?? "Panel"}
                </h1>
                {currentPage?.description && (
                  <p className="hidden truncate text-xs text-slate-500 sm:block">
                    {currentPage.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Ara..."
              className="h-10 w-56 rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/15 lg:w-64"
              readOnly
              aria-label="Arama"
            />
          </div>

          <button
            type="button"
            className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-soft transition hover:bg-slate-50 hover:text-slate-800"
            aria-label="Bildirimler"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary-500" />
          </button>

          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 shadow-soft sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 text-xs font-semibold text-white">
              ST
            </div>
            <div className="leading-tight">
              <p className="text-xs font-medium text-slate-800">Hoş geldiniz</p>
              <p className="text-[10px] text-slate-400">Yönetim oturumu</p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={logout} className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Çıkış</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
