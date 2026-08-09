import { Suspense } from "react";
import type { Metadata } from "next";
import UrunlerPage from "./UrunlerClient";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export const metadata: Metadata = {
  title: "Ürünler | Servis Takip",
  description: "Teknoloji ürün kataloğumuzu inceleyin.",
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <UrunlerPage />
    </Suspense>
  );
}
