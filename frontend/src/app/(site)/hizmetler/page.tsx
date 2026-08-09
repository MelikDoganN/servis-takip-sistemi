import type { Metadata } from "next";
import Link from "next/link";
import {
  ClipboardCheck,
  MessageSquare,
  Search,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = {
  title: "Hizmetler | Servis Takip",
  description: "Teknik servis, garanti takibi ve servis süreci hizmetlerimiz.",
};

const SERVICES = [
  {
    icon: Wrench,
    title: "Teknik Servis",
    text: "Cihaz arızalarında teknik inceleme, teşhis ve onarım süreçlerini yönetiriz.",
  },
  {
    icon: ShieldCheck,
    title: "Garanti Takibi",
    text: "Seri numarası ile garanti başlangıç ve bitiş durumunu sorgulayabilirsiniz.",
  },
  {
    icon: ClipboardCheck,
    title: "Cihaz Kabul",
    text: "Cihazınız kabul edilerek kayıt altına alınır ve servis süreci başlatılır.",
  },
  {
    icon: Search,
    title: "Arıza Takibi",
    text: "Oluşturulan servis kaydı üzerinden işlem durumunu takip edebilirsiniz.",
  },
  {
    icon: Truck,
    title: "Teknisyen Yönlendirme",
    text: "Uygun teknisyen ataması ile işlemler planlı ve düzenli ilerler.",
  },
  {
    icon: MessageSquare,
    title: "Servis Durumu Takibi",
    text: "Önemli aşamalarda WhatsApp üzerinden bilgilendirme yapılır.",
  },
];

export default function HizmetlerPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Reveal>
        <h1 className="text-3xl font-semibold tracking-tight text-navy">Hizmetler</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Teknik servis ve satış sonrası süreçlerimizi müşteri odaklı şekilde sunuyoruz.
        </p>
      </Reveal>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s, i) => (
          <Reveal key={s.title} delayMs={i * 40}>
            <article className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                <s.icon className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="font-semibold text-navy">{s.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{s.text}</p>
            </article>
          </Reveal>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/garanti-sorgula"
          className="inline-flex h-11 items-center rounded-xl bg-navy px-5 text-sm font-medium text-white"
        >
          Garanti Sorgula
        </Link>
        <Link
          href="/servis-sorgula"
          className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-navy"
        >
          Servis Sorgula
        </Link>
      </div>
    </div>
  );
}
