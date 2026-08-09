import type { Metadata } from "next";
import { Reveal } from "@/components/site/Reveal";

export const metadata: Metadata = {
  title: "İletişim | Servis Takip",
  description: "Servis ve ürün talepleri için iletişim.",
};

export default function IletisimPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Reveal>
        <h1 className="text-3xl font-semibold tracking-tight text-navy">İletişim</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ürün ve servis talepleriniz için bizimle iletişime geçebilirsiniz.
        </p>
      </Reveal>

      <Reveal delayMs={60}>
        <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          İletişim bilgileri yakında eklenecek.
        </div>
      </Reveal>

      <Reveal delayMs={100}>
        <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <p className="text-sm text-slate-500">
            Online form gönderimi henüz aktif değildir. İletişim bilgileri eklendikten
            sonra bu alan kullanılabilir olacaktır.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Ad Soyad</label>
            <input className="field-base" disabled placeholder="Adınız" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">E-posta</label>
            <input className="field-base" type="email" disabled placeholder="ornek@email.com" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Mesaj</label>
            <textarea
              className="field-base min-h-[120px] py-2"
              disabled
              placeholder="Mesajınız"
            />
          </div>
          <button
            type="button"
            disabled
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-200 text-sm font-medium text-slate-500"
          >
            Form yakında aktif olacak
          </button>
        </div>
      </Reveal>
    </div>
  );
}
