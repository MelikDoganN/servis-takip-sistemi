import type { Metadata } from "next";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNavbar } from "@/components/site/SiteNavbar";

export const metadata: Metadata = {
  title: "Servis Takip | Teknoloji Ürünleri ve Teknik Servis",
  description:
    "Teknoloji ürünlerini inceleyin; teknik servis, garanti ve servis takip işlemlerinizi kolayca yönetin.",
  openGraph: {
    title: "Servis Takip | Teknoloji Ürünleri ve Teknik Servis",
    description:
      "Teknoloji ürünlerini inceleyin; teknik servis, garanti ve servis takip işlemlerinizi kolayca yönetin.",
    type: "website",
    locale: "tr_TR",
    siteName: "Servis Takip",
  },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-slate-900">
      <SiteNavbar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
