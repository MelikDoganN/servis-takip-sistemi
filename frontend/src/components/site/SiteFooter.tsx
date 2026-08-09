import Link from "next/link";
import { Settings2 } from "lucide-react";

const FOOTER_LINKS = [
  { href: "/urunler", label: "Ürünler" },
  { href: "/hizmetler", label: "Hizmetler" },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/garanti-sorgula", label: "Garanti Sorgula" },
  { href: "/servis-sorgula", label: "Servis Sorgula" },
  { href: "/login", label: "Personel Girişi" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:justify-between lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy">
              <Settings2 className="h-4 w-4 text-white" aria-hidden />
            </span>
            <span className="text-sm font-semibold text-navy">Servis Takip</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
            Teknoloji ürünleri, teknik servis ve garanti süreçlerini tek noktadan
            yönetmenize yardımcı oluruz.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm" aria-label="Alt menü">
          {FOOTER_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-slate-600 hover:text-navy">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-slate-100 px-4 py-5 text-center text-xs text-slate-400 sm:px-6">
        © 2026 Servis Takip
      </div>
    </footer>
  );
}
