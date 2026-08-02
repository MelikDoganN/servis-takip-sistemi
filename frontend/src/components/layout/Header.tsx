"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, User } from "lucide-react";
import { navItems } from "@/config/navigation";
import { useSidebar } from "@/hooks/useSidebar";
import {
  getAuthEmail,
  getAuthRoles,
  logout,
} from "@/lib/auth";
import { roleLabel } from "@/types/role";
import { Button } from "@/components/ui/Button";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { cn } from "@/lib/utils";

function primaryRoleLabel(roles: string[]): string {
  if (roles.length === 0) return "Kullanıcı";
  const order = [
    "ROLE_ADMIN",
    "ROLE_REGION_MANAGER",
    "ROLE_CENTER_OPERATOR",
    "ROLE_TECHNICIAN",
  ];
  const found = order.find((r) => roles.includes(r));
  return roleLabel(found ?? roles[0]);
}

function initialsFromEmail(email: string | null): string {
  if (!email) return "ST";
  const local = email.split("@")[0] || "ST";
  return local.slice(0, 2).toUpperCase();
}

export function Header() {
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const currentPage = navItems.find((item) => item.href === pathname);
  const [email, setEmail] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEmail(getAuthEmail());
    setRoles(getAuthRoles());
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const roleText = primaryRoleLabel(roles);

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-slate-200/90 bg-white/95 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="rounded-xl p-2 text-navy transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 lg:hidden"
            aria-label="Menüyü aç"
          >
            <Menu className="h-5 w-5" />
          </button>

          <nav className="min-w-0" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-sm">
              <li className="hidden text-slate-400 sm:inline">Panel</li>
              <li className="hidden text-slate-300 sm:inline" aria-hidden>
                /
              </li>
              <li className="truncate font-medium text-navy">
                {currentPage?.label ?? "Sayfa"}
              </li>
            </ol>
          </nav>
        </div>

        <div className="flex h-10 items-center gap-2 sm:gap-2.5">
          <GlobalSearch />
          <NotificationBell />

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "flex h-10 max-w-[14rem] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 py-1 pl-1 pr-2.5 transition",
                "hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              )}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Kullanıcı menüsü"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-xs font-semibold text-white">
                {initialsFromEmail(email)}
              </span>
              <span className="hidden min-w-0 leading-tight sm:block">
                <span className="block truncate text-xs font-semibold text-navy">
                  {email ?? "Oturum"}
                </span>
                <span className="block truncate text-[10px] text-slate-400">
                  {roleText}
                </span>
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-elevated animate-fade-in"
              >
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="truncate text-sm font-medium text-navy">
                    {email ?? "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{roleText}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-50"
                  onClick={() => setMenuOpen(false)}
                >
                  <User className="h-4 w-4 text-slate-400" />
                  Oturum bilgisi
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                  Çıkış Yap
                </button>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="h-10 gap-1.5 sm:hidden"
            aria-label="Çıkış Yap"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
