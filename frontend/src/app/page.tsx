"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDefaultHomePath, isAuthenticated } from "@/lib/auth";
import { navItems } from "@/config/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    router.replace(getDefaultHomePath(navItems));
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}
