"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDefaultHomePath, isAuthenticated } from "@/lib/auth";
import { navItems } from "@/config/navigation";

const NAV_LINKS = [
  { href: "#ozellikler", label: "Özellikler" },
  { href: "#nasil-calisir", label: "Nasıl Çalışır" },
  { href: "#whatsapp", label: "WhatsApp" },
  { href: "#raporlama", label: "Raporlama" },
  { href: "#teknisyen", label: "Teknisyen Yönetimi" },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [panelHref, setPanelHref] = useState("/dashboard");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const ok = isAuthenticated();
    setAuthed(ok);
    if (ok) setPanelHref(getDefaultHomePath(navItems));
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-200",
        scrolled
          ? "border-slate-200/80 bg-white/90 shadow-soft backdrop-blur-md"
          : "border-transparent bg-white/70 backdrop-blur-sm"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#ust" className="flex items-center gap-2.5" onClick={close}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy">
            <Settings2 className="h-4 w-4 text-white" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight text-navy sm:text-base">
            Servis Takip
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Ana menü">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-navy"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {authed ? (
            <Link
              href={panelHref}
              className="inline-flex h-10 items-center rounded-xl bg-navy px-4 text-sm font-medium text-white transition hover:bg-navy-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              Panele Git
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium text-navy transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Giriş Yap
              </Link>
              <a
                href="#ozellikler"
                className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-sm font-medium text-white transition hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                Sistemi Keşfet
              </a>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-navy lg:hidden"
          aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4" aria-label="Mobil menü">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={close}
                className="rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-3">
              {authed ? (
                <Link
                  href={panelHref}
                  onClick={close}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-navy text-sm font-medium text-white"
                >
                  Panele Git
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={close}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 text-sm font-medium text-navy"
                  >
                    Giriş Yap
                  </Link>
                  <a
                    href="#ozellikler"
                    onClick={close}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-accent text-sm font-medium text-white"
                  >
                    Sistemi Keşfet
                  </a>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
