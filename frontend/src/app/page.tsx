import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Servis Takip Sistemi | Akıllı Servis Yönetim Platformu",
  description:
    "İş emirleri, müşteriler, cihazlar, teknisyenler, garanti ve WhatsApp bildirimlerini tek panelden yönetin.",
  openGraph: {
    title: "Servis Takip Sistemi | Akıllı Servis Yönetim Platformu",
    description:
      "İş emirleri, müşteriler, cihazlar, teknisyenler, garanti ve WhatsApp bildirimlerini tek panelden yönetin.",
    type: "website",
    locale: "tr_TR",
    siteName: "Servis Takip Sistemi",
  },
  twitter: {
    card: "summary_large_image",
    title: "Servis Takip Sistemi | Akıllı Servis Yönetim Platformu",
    description:
      "İş emirleri, müşteriler, cihazlar, teknisyenler, garanti ve WhatsApp bildirimlerini tek panelden yönetin.",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
