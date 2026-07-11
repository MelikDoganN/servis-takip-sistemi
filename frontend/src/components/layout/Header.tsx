"use client";

import { usePathname } from "next/navigation";
import { navItems } from "@/config/navigation";

export function Header() {
  const pathname = usePathname();
  const currentPage = navItems.find((item) => item.href === pathname);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          {currentPage?.label ?? "Panel"}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="Bildirimler"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
            K2
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">Kullanıcı</p>
            <p className="text-xs text-gray-500">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
