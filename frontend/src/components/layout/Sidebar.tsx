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
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent">
            <Settings2 className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-white">
              Servis Takip
            </p>
            <p className="truncate text-[11px] text-slate-400">
              Yönetim Paneli
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Menü
        </p>
        {visibleItems.length === 0 ? (
          <p className="px-3 text-xs text-slate-500">
            Bu hesap için görüntülenecek menü bulunmuyor.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={item.label}
                    onClick={mobile ? close : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                      isActive
                        ? "nav-link-active"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {isActive && (
                      <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-accent animate-nav-indicator" />
                    )}
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
                        isActive
                          ? "bg-accent/25 text-accent"
                          : "text-slate-400 group-hover:text-slate-200"
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-3.5">
        <p className="truncate text-[11px] text-slate-400">
          Servis Takip Sistemi
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500">v0.1.0</p>
      </div>
    </>
  );

  if (mobile) {
    return (
      <div className="flex h-full w-[260px] flex-col bg-sidebar text-white shadow-elevated animate-slide-up">
        {content}
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[260px] lg:flex-col",
        "bg-sidebar text-white"
      )}
    >
      {content}
    </aside>
  );
}
