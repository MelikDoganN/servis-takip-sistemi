import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = {
  title: "Hakkımızda | Servis Takip",
  description: "Teknoloji odaklı servis işletmesi hakkında bilgi.",
};

const VALUES = ["Güven", "Şeffaflık", "Hızlı Takip", "Müşteri İletişimi"];

export default function HakkimizdaPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Reveal>
        <h1 className="text-3xl font-semibold tracking-tight text-navy">Hakkımızda</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Satış sonrası süreçleri, teknik servis operasyonlarını ve müşteri iletişimini
          düzenli şekilde yönetmeyi amaçlayan teknoloji odaklı servis işletmesiyiz.
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Ürün tanıtımı, garanti sorgulama ve servis takip süreçlerini müşterilerimizin
          daha net takip edebilmesi için dijital araçlarla destekliyoruz.
        </p>
      </Reveal>
      <Reveal delayMs={80}>
        <h2 className="mt-10 text-lg font-semibold text-navy">Değerlerimiz</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {VALUES.map((v) => (
            <li
              key={v}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-navy shadow-soft"
            >
              {v}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delayMs={120}>
        <Link
          href="/iletisim"
          className="mt-10 inline-flex h-11 items-center rounded-xl bg-navy px-5 text-sm font-medium text-white"
        >
          İletişime Geç
        </Link>
      </Reveal>
    </div>
  );
}
