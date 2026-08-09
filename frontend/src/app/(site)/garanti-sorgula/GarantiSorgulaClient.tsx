"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DetailList } from "@/components/ui/DetailList";
import { Reveal } from "@/components/site/Reveal";
import {
  PublicLookupError,
  publicLookupService,
} from "@/services/publicLookupService";
import {
  PublicWarranty,
  publicDisplayValue,
  publicFormatDate,
  publicWarrantyStatusLabel,
} from "@/types/publicLookup";

function warrantyErrorMessage(err: unknown): string {
  const status = err instanceof PublicLookupError ? err.status : undefined;
  if (status === 404) {
    return "Bu seri numarasına ait garanti kaydı bulunamadı.";
  }
  if (status === 429) {
    return "Çok fazla sorgu yaptınız. Lütfen kısa bir süre sonra tekrar deneyin.";
  }
  if (status === 400) {
    return "Seri numarası giriniz.";
  }
  return "Garanti bilgisi şu anda alınamıyor.";
}

function statusBadgeVariant(
  status?: string | null
): "success" | "danger" | "neutral" | "warning" {
  switch ((status || "").toUpperCase()) {
    case "AKTIF":
      return "success";
    case "SURESI_DOLMUS":
      return "danger";
    case "TARIH_EKSIK":
      return "warning";
    default:
      return "neutral";
  }
}

export default function GarantiSorgulaClient() {
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PublicWarranty | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = serial.trim();
    if (!value) {
      setError("Seri numarası giriniz.");
      setResult(null);
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await publicLookupService.getPublicWarranty(value);
      setResult(data);
    } catch (err) {
      setError(warrantyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const status = (result?.warrantyStatus || "").toUpperCase();
  const deviceLabel = [result?.brand, result?.model]
    .filter((p) => p && String(p).trim())
    .join(" ");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Reveal>
        <h1 className="text-3xl font-semibold tracking-tight text-navy">Garanti Sorgula</h1>
        <p className="mt-2 text-sm text-slate-600">
          Cihazınızın seri numarasını girerek garanti durumunu kontrol edin.
        </p>
      </Reveal>

      <Reveal delayMs={60}>
        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
          noValidate
        >
          <div>
            <label htmlFor="serial" className="mb-1.5 block text-sm font-medium text-slate-700">
              Seri Numarası
            </label>
            <input
              id="serial"
              className="field-base"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="Örn. SN-XXXXXXXX"
              autoComplete="off"
              disabled={loading}
            />
          </div>
          <Button type="submit" loading={loading} disabled={loading} className="w-full sm:w-auto">
            Sorgula
          </Button>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            >
              {error}
            </p>
          )}
        </form>
      </Reveal>

      {result && (
        <Reveal delayMs={40}>
          <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                <Shield className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="text-lg font-semibold text-navy">Garanti Bilgisi</h2>
              <Badge variant={statusBadgeVariant(result.warrantyStatus)}>
                {publicWarrantyStatusLabel(result.warrantyStatus)}
              </Badge>
            </div>
            <DetailList
              items={[
                {
                  label: "Cihaz",
                  value: publicDisplayValue(deviceLabel || null),
                },
                {
                  label: "Seri No",
                  value: publicDisplayValue(result.serialNumber || serial.trim()),
                },
                {
                  label: "Garanti Başlangıcı",
                  value: publicFormatDate(result.warrantyStart),
                },
                {
                  label: "Garanti Bitişi",
                  value: publicFormatDate(result.warrantyEnd),
                },
                {
                  label: "Durum",
                  value: publicWarrantyStatusLabel(result.warrantyStatus),
                },
              ]}
            />
            {status === "TARIH_EKSIK" && (
              <p className="text-sm text-slate-500">
                Cihazda satın alma veya kurulum tarihi bulunmadığı için garanti bitiş
                bilgisi netleştirilememiş olabilir.
              </p>
            )}
          </div>
        </Reveal>
      )}
    </div>
  );
}
