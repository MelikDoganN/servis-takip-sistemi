"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { navItems } from "@/config/navigation";
import {
  getAuthRoles,
  getDefaultHomePath,
  isAuthenticated,
  isTokenExpired,
  logout,
} from "@/lib/auth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Token + roles claim doğrular; sayfa rol matrisine göre erişim mesajı gösterir.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!isAuthenticated() || isTokenExpired()) {
      logout();
      return;
    }

    const roles = getAuthRoles();
    if (roles.length === 0) {
      // Eski token'da roles claim yok → yeniden giriş
      logout();
      return;
    }

    const nav = navItems.find((item) => item.href === pathname);
    if (nav && !nav.roles.some((allowed) => roles.includes(allowed))) {
      setDenied(true);
      setReady(true);
      return;
    }

    setDenied(false);
    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <EmptyState
          icon={<ShieldAlert className="h-5 w-5" />}
          title="Bu sayfaya erişim yetkiniz yok"
          description="Hesabınızın rolü bu bölümü görüntülemek için yeterli değil. Ana panele dönebilir veya farklı bir hesapla giriş yapabilirsiniz."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(getDefaultHomePath(navItems))}
              >
                Ana Sayfam
              </Button>
              <Button variant="secondary" onClick={logout}>
                Çıkış Yap
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
