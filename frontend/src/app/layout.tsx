import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Servis Takip | Teknoloji Ürünleri ve Teknik Servis",
    template: "%s",
  },
  description:
    "Teknoloji ürünleri, teknik servis, garanti ve servis takip işlemleri.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
