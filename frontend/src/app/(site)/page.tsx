"use client";

import { useEffect, useState } from "react";
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
import { ProductCard } from "@/components/site/ProductCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { publicProductService } from "@/services/publicProductService";
import type { Product, ProductCategory } from "@/types/product";

const SERVICES = [
  {
    icon: Wrench,
    title: "Teknik Servis",
    text: "Cihaz arızalarında uzman teknik inceleme ve onarım süreci.",
  },
  {
    icon: ShieldCheck,
    title: "Garanti Takibi",
    text: "Seri numarası ile garanti başlangıç ve bitiş durumunu sorgulayın.",
  },
  {
    icon: ClipboardCheck,
    title: "Cihaz Kabul",
    text: "Cihazınız kabul edilerek kayıt altına alınır ve süreç başlar.",
  },
  {
    icon: Search,
    title: "Arıza Takibi",
    text: "Servis kaydı üzerinden işlem durumunu takip edebilirsiniz.",
  },
  {
    icon: Truck,
    title: "Teknisyen Yönlendirme",
    text: "Uygun teknisyen ataması ile işlemler planlı ilerler.",
  },
  {
    icon: MessageSquare,
    title: "Servis Durumu Takibi",
    text: "Önemli aşamalarda WhatsApp üzerinden bilgilendirme yapılır.",
  },
];

const VALUES = [
  { title: "Güven", text: "Şeffaf kayıt ve takip ile güvenilir servis süreci." },
  { title: "Şeffaflık", text: "Cihaz ve servis durumunu net şekilde görün." },
  { title: "Hızlı Takip", text: "Süreç adımlarını güncel olarak izleyin." },
  { title: "Müşteri İletişimi", text: "WhatsApp bildirimleriyle bilgilendirilirsiniz." },
];

const PROCESS = [
  "Cihaz kabul edilir",
  "Servis kaydı oluşturulur",
  "Teknisyen incelemeye başlar",
  "Durum WhatsApp ile bildirilir",
  "Cihaz teslime hazırlanır",
];

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingCats, setLoadingCats] = useState(true);
  const [featuredError, setFeaturedError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const items = await publicProductService.getFeatured();
        if (alive) setFeatured(items ?? []);
      } catch {
        if (alive) setFeaturedError("Öne çıkan ürünler yüklenemedi.");
      } finally {
        if (alive) setLoadingFeatured(false);
      }
    })();
    (async () => {
      try {
        const cats = await publicProductService.getCategories();
        if (alive) setCategories(cats ?? []);
      } catch {
        /* kategori opsiyonel */
      } finally {
        if (alive) setLoadingCats(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-surface">
        <div className="pointer-events-none absolute inset-0 landing-hero-glow" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8 lg:py-20">
          <div className="landing-hero-copy">
            <p className="mb-4 inline-flex rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-medium text-accent-strong">
              Teknoloji · Satış · Teknik Servis
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-navy sm:text-4xl lg:text-[2.6rem] lg:leading-[1.15]">
              Teknoloji, Satış ve Teknik Servis{" "}
              <span className="text-accent-strong">Tek Noktada</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Telefon, bilgisayar ve elektronik ürünleri keşfedin. Teknik servis,
              garanti ve servis takip işlemlerinizi kolayca yönetin.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/urunler"
                className="inline-flex h-11 items-center rounded-xl bg-navy px-5 text-sm font-medium text-white hover:bg-navy-soft"
              >
                Ürünleri İncele
              </Link>
              <Link
                href="/servis-sorgula"
                className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-navy hover:bg-slate-50"
              >
                Servis Sorgula
              </Link>
            </div>
          </div>
          <div className="landing-hero-visual relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-accent/20 to-navy/10 blur-2xl" aria-hidden />
            <div className="relative rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-elevated">
              <div className="grid grid-cols-2 gap-3">
                {["Ürün Kataloğu", "Teknik Servis", "Garanti Sorgu", "Durum Takibi"].map(
                  (label, i) => (
                    <div
                      key={label}
                      className={`rounded-xl border border-slate-100 bg-slate-50 p-4 ${
                        i % 2 === 0 ? "landing-float-a" : "landing-float-b"
                      }`}
                    >
                      <p className="text-sm font-semibold text-navy">{label}</p>
                      <p className="mt-1 text-xs text-slate-500">Müşteri odaklı süreç</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHead
              eyebrow="Kategoriler"
              title="Ürün kategorilerini keşfedin"
              subtitle="Kataloğumuzdaki aktif kategoriler."
            />
          </Reveal>
          <div className="mt-8">
            {loadingCats ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <p className="text-center text-sm text-slate-500">
                Henüz kategori bulunmuyor.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {categories.map((c, i) => (
                  <Reveal key={c.id} delayMs={i * 40}>
                    <Link
                      href={`/urunler?category=${encodeURIComponent(c.slug)}`}
                      className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated"
                    >
                      <p className="font-semibold text-navy">{c.name}</p>
                      {c.description && (
                        <p className="mt-1 text-sm text-slate-500 line-clamp-2">
                          {c.description}
                        </p>
                      )}
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="border-y border-slate-200/80 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <SectionHead
                eyebrow="Öne Çıkan Ürünler"
                title="Seçili ürünlerimizi inceleyin"
                subtitle="Veritabanındaki gerçek ürün kayıtları."
                align="left"
              />
              <Link href="/urunler" className="text-sm font-medium text-accent-strong hover:text-navy">
                Tüm ürünler →
              </Link>
            </div>
          </Reveal>
          <div className="mt-8">
            {loadingFeatured ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-2xl" />
                ))}
              </div>
            ) : featuredError ? (
              <p className="text-center text-sm text-slate-500">{featuredError}</p>
            ) : featured.length === 0 ? (
              <p className="text-center text-sm text-slate-500">
                Henüz öne çıkan ürün bulunmuyor.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {featured.map((p, i) => (
                  <Reveal key={p.id} delayMs={i * 40}>
                    <ProductCard product={p} />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHead
              eyebrow="Hizmetlerimiz"
              title="Teknik servis ve takip çözümleri"
              subtitle="İşletmemizin sunduğu servis kabiliyetleri."
            />
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => (
              <Reveal key={s.title} delayMs={i * 40}>
                <article className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                    <s.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="font-semibold text-navy">{s.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{s.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/hizmetler" className="text-sm font-medium text-accent-strong">
              Tüm hizmetler →
            </Link>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="border-y border-slate-200/80 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHead
              eyebrow="Neden Biz?"
              title="Neden bizi tercih etmelisiniz?"
              subtitle="Müşteri iletişimi ve şeffaf takip odaklı yaklaşım."
            />
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delayMs={i * 40}>
                <div className="rounded-2xl border border-slate-200 bg-surface/60 p-5">
                  <h3 className="font-semibold text-navy">{v.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{v.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHead
              eyebrow="Servis Süreci"
              title="Cihazınız nasıl ilerler?"
              subtitle="Müşteriye yönelik basit süreç adımları."
            />
          </Reveal>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PROCESS.map((step, i) => (
              <Reveal key={step} delayMs={i * 50}>
                <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <p className="mt-3 text-sm font-medium text-navy">{step}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Query CTA */}
      <section className="border-y border-slate-200/80 bg-navy-deep py-14 text-white sm:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Garanti veya servis durumunuzu sorgulayın
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">
              Seri numarası ile garanti kontrolü yapın veya servis takip seçeneklerini
              inceleyin.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/garanti-sorgula"
                className="inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-medium text-white hover:bg-accent-strong"
              >
                Garanti Sorgula
              </Link>
              <Link
                href="/servis-sorgula"
                className="inline-flex h-11 items-center rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-medium text-white hover:bg-white/10"
              >
                Servis Sorgula
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* About short */}
      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card sm:p-10">
              <p className="text-xs font-medium uppercase tracking-wide text-accent-strong">
                Hakkımızda
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-navy">
                Teknoloji odaklı servis yaklaşımı
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                Satış sonrası süreçleri, teknik servis operasyonlarını ve müşteri
                iletişimini düzenli şekilde yönetmeyi amaçlayan teknoloji odaklı
                servis işletmesiyiz.
              </p>
              <Link
                href="/hakkimizda"
                className="mt-5 inline-flex text-sm font-medium text-accent-strong"
              >
                Daha fazla bilgi →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-3xl bg-navy px-6 py-10 text-center shadow-elevated sm:px-10">
              <h2 className="text-2xl font-semibold text-white">Bize ulaşın</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-slate-300">
                Ürün ve servis talepleriniz için iletişim sayfasını ziyaret edin.
              </p>
              <Link
                href="/iletisim"
                className="mt-6 inline-flex h-11 items-center rounded-xl bg-accent px-5 text-sm font-medium text-white hover:bg-accent-strong"
              >
                İletişim
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function SectionHead({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-xs font-medium uppercase tracking-wide text-accent-strong">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-slate-600 sm:text-base">{subtitle}</p>
    </div>
  );
}
