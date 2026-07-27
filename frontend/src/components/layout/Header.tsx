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
    <header className="sticky top-0 z-20 border-b border-primary-100/80 bg-white/90 shadow-soft backdrop-blur-md">
      <div className="h-0.5 w-full bg-gradient-to-r from-navy via-accent to-primary-300" />
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="rounded-xl p-2 text-navy transition hover:bg-primary-50 lg:hidden"
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <div className="mb-0.5 hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
              <span className="font-medium text-navy/60">Kurumsal Panel</span>
              <span>/</span>
              <span className="text-accent-strong">{currentPage?.label ?? "Sayfa"}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="hidden h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-primary-600 text-white shadow-soft sm:inline-flex">
                {currentPage?.icon}
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold tracking-tight text-navy sm:text-lg">
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
              className="h-10 w-56 rounded-xl border border-slate-200 bg-surface pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/20 lg:w-64"
              readOnly
              aria-label="Arama"
            />
          </div>

          <button
            type="button"
            className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-navy/70 shadow-soft transition hover:border-accent/40 hover:bg-accent-soft hover:text-navy"
            aria-label="Bildirimler"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(18,167,205,0.8)]" />
          </button>

          <div className="hidden items-center gap-2 rounded-xl border border-primary-100 bg-gradient-to-r from-white to-primary-50/50 py-1.5 pl-1.5 pr-3 shadow-soft sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-navy to-accent text-xs font-semibold text-white">
              ST
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-navy">Hoş geldiniz</p>
              <p className="text-[10px] text-slate-400">Yönetim oturumu</p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={logout} className="gap-1.5 border-navy/15 text-navy hover:border-accent hover:bg-accent-soft">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Çıkış</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
