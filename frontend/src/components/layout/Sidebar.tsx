"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/config/navigation";
import { useSidebar } from "@/hooks/useSidebar";
import { getAuthRoles } from "@/lib/auth";

interface SidebarProps {
  mobile?: boolean;
}

export function Sidebar({ mobile = false }: SidebarProps) {
  const pathname = usePathname();
  const { close } = useSidebar();
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    setRoles(getAuthRoles());
  }, []);

  const visibleItems = useMemo(() => {
    if (roles.length === 0) return [];
    return navItems.filter((item) =>
      item.roles.some((allowed) => roles.includes(allowed))
    );
  }, [roles]);

  const content = (
    <>
      <div className="relative flex h-16 shrink-0 items-center overflow-hidden border-b border-sidebar-border px-5">
        <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-accent/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-0 h-20 w-32 rounded-full bg-navy-soft/40 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-primary-600 shadow-sidebar-glow ring-1 ring-white/20">
            <Settings2 className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">
              Servis Takip
            </p>
            <p className="truncate text-[11px] font-medium text-primary-200/90">
              Kurumsal Yönetim Paneli
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-300/70">
          Ana Menü
        </p>
        {visibleItems.length === 0 ? (
          <p className="px-3 text-xs text-slate-500">
            Bu hesap için görüntülenecek menü bulunmuyor.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.label}
                    onClick={mobile ? close : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                      isActive
                        ? "nav-link-active"
                        : "text-slate-300 hover:bg-sidebar-hover hover:text-white"
                    )}
                  >
                    {isActive && (
                      <span className="absolute inset-y-1.5 left-0 w-1 origin-center rounded-r-full bg-accent animate-nav-indicator shadow-[0_0_10px_rgba(18,167,205,0.8)]" />
                    )}
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
                        isActive
                          ? "bg-accent/30 text-white scale-105"
                          : "bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-accent"
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent animate-pulse" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="border-t border-sidebar-border bg-navy-deep/40 px-5 py-4">
        <p className="truncate text-[11px] font-medium text-primary-200/80">
          Servis Takip Sistemi
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500">
          Kurumsal · v0.1.0
        </p>
      </div>
    </>
  );

  if (mobile) {
    return (
      <div className="flex h-full w-[260px] flex-col bg-gradient-to-b from-sidebar via-navy to-navy-deep text-white animate-slide-up shadow-elevated">
        {content}
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[260px] lg:flex-col",
        "bg-gradient-to-b from-sidebar via-navy to-navy-deep text-white"
      )}
    >
      {content}
    </aside>
  );
}
