"use client";

import { usePathname } from "next/navigation";

/** Sayfa geçişlerinde fade + slide */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
