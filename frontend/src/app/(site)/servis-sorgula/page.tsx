import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare, Hash } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = {
  title: "Servis Sorgula | Servis Takip",
  description: "Servis durumunuzu güvenli kanallar üzerinden takip edin.",
};

export default function ServisSorgulaPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Reveal>
        <h1 className="text-3xl font-semibold tracking-tight text-navy">Servis Sorgula</h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          Servis durumunuzu WhatsApp üzerinden veya size verilen servis numarasıyla
          takip edebilirsiniz.
        </p>
      </Reveal>

      <div className="mt-8 grid gap-4">
        <Reveal delayMs={40}>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                <MessageSquare className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold text-navy">WhatsApp ile takip</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Kayıtlı hattınız üzerinden servis botu ile &quot;Servislerim&quot; veya
                  servis numarası ile durum sorgulayabilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal delayMs={80}>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                <Hash className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold text-navy">Servis numarası</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Size verilen{" "}
                  <span className="font-mono text-navy">SRV-YYYY-XXXXXX</span> formatındaki
                  servis numarası ile durum bilginizi WhatsApp üzerinden öğrenin.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delayMs={120}>
        <p className="mt-8 text-sm text-slate-500">
          Web üzerinden açık servis sorgu alanı, müşteri verilerinin korunması için
          şu an sunulmamaktadır.
        </p>
        <Link
          href="/garanti-sorgula"
          className="mt-4 inline-flex text-sm font-medium text-accent-strong"
        >
          Garanti sorgulamaya git →
        </Link>
      </Reveal>
    </div>
  );
}
