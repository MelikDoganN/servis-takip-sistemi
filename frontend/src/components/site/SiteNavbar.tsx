"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDefaultHomePath, isAuthenticated } from "@/lib/auth";
import { navItems } from "@/config/navigation";

const LINKS = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/urunler", label: "Ürünler" },
  { href: "/hizmetler", label: "Hizmetler" },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/garanti-sorgula", label: "Garanti Sorgula" },
  { href: "/servis-sorgula", label: "Servis Sorgula" },
  { href: "/iletisim", label: "İletişim" },
];

export function SiteNavbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [panelHref, setPanelHref] = useState("/dashboard");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ok = isAuthenticated();
    setAuthed(ok);
    if (ok) setPanelHref(getDefaultHomePath(navItems));
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-200",
        scrolled
          ? "border-slate-200/80 bg-white/95 shadow-soft backdrop-blur-md"
          : "border-transparent bg-white/80 backdrop-blur-sm"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy">
            <Settings2 className="h-4 w-4 text-white" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight text-navy sm:text-base">
            Servis Takip
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Ana menü">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-2.5 py-2 text-sm font-medium transition",
                isActive(link.href)
                  ? "bg-accent-soft text-accent-strong"
                  : "text-slate-600 hover:bg-slate-100 hover:text-navy"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          {authed ? (
            <Link
              href={panelHref}
              className="inline-flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-medium text-white hover:bg-navy-soft"
            >
              Panele Git
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-medium text-white hover:bg-navy-soft"
            >
              Giriş Yap
            </Link>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-navy xl:hidden"
          aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white xl:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4" aria-label="Mobil menü">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-3 py-3 text-sm font-medium",
                  isActive(link.href) ? "bg-accent-soft text-accent-strong" : "text-slate-700"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={authed ? panelHref : "/login"}
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-navy text-sm font-medium text-white"
            >
              {authed ? "Panele Git" : "Giriş Yap"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
