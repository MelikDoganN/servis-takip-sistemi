"use client";

import { usePathname } from "next/navigation";
import { navItems } from "@/config/navigation";
import { useSidebar } from "@/hooks/useSidebar";
import { logout } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export function Header() {
  const pathname = usePathname();
  const { toggle } = useSidebar();
  const currentPage = navItems.find((item) => item.href === pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          aria-label="Menüyü aç"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-900 sm:text-xl">
          {currentPage?.label ?? "Panel"}
        </h1>
      </div>

      <Button variant="outline" size="sm" onClick={logout}>
        Çıkış
      </Button>
    </header>
  );
}
