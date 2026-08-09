"use client";

import { useState } from "react";
import { Wrench } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DetailList } from "@/components/ui/DetailList";
import { Reveal } from "@/components/site/Reveal";
import {
  PublicLookupError,
  publicLookupService,
} from "@/services/publicLookupService";
import {
  PublicServiceStatus,
  publicDisplayValue,
  publicFormatDateTime,
  publicServiceStatusLabel,
} from "@/types/publicLookup";

function serviceErrorMessage(err: unknown): string {
  const status = err instanceof PublicLookupError ? err.status : undefined;
  if (status === 404) {
    return "Servis kaydı bulunamadı. Servis numarası ve telefon bilgilerinizi kontrol edin.";
  }
  if (status === 429) {
    return "Çok fazla sorgu yaptınız. Lütfen kısa bir süre sonra tekrar deneyin.";
  }
  if (status === 400) {
    return "Servis numarası ve telefon bilgilerini giriniz.";
  }
  return "Servis bilgisi şu anda alınamıyor.";
}

function statusBadgeVariant(
  status?: string | null
): "success" | "danger" | "neutral" | "warning" | "info" {
  switch ((status || "").toUpperCase()) {
    case "DELIVERED":
    case "CLOSED":
    case "RESOLVED":
    case "READY_FOR_DELIVERY":
      return "success";
    case "CANCELLED":
      return "danger";
    case "WAITING_PARTS":
      return "warning";
    case "IN_PROGRESS":
    case "ASSIGNED":
      return "info";
    default:
      return "neutral";
  }
}

export default function ServisSorgulaClient() {
  const [serviceNumber, setServiceNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PublicServiceStatus | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sn = serviceNumber.trim();
    const phoneValue = phone.trim();

    if (!sn) {
      setError("Servis numarası giriniz.");
      setResult(null);
      return;
    }
    if (!phoneValue) {
      setError("Telefon numarası giriniz.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await publicLookupService.getPublicServiceStatus(sn, phoneValue);
      setResult(data);
    } catch (err) {
      setError(serviceErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const deviceLabel = [result?.brand, result?.model]
    .filter((p) => p && String(p).trim())
    .join(" ");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Reveal>
        <h1 className="text-3xl font-semibold tracking-tight text-navy">Servis Sorgula</h1>
        <p className="mt-2 text-sm text-slate-600">
          Servis numaranız ve kayıtlı telefonunuz ile servis durumunu sorgulayın.
        </p>
      </Reveal>

      <Reveal delayMs={60}>
        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card"
          noValidate
        >
          <div>
            <label
              htmlFor="serviceNumber"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Servis No
            </label>
            <input
              id="serviceNumber"
              className="field-base font-mono"
              value={serviceNumber}
              onChange={(e) => setServiceNumber(e.target.value)}
              placeholder="SRV-2026-000021"
              autoComplete="off"
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700">
              Telefon Numarası
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              className="field-base"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XX XXX XX XX"
              autoComplete="tel"
              disabled={loading}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Servis kaydındaki müşteri telefon numarası ile aynı olmalıdır.
            </p>
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
                <Wrench className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="text-lg font-semibold text-navy">Servis Durumu</h2>
              <Badge variant={statusBadgeVariant(result.status)}>
                {publicServiceStatusLabel(result.status)}
              </Badge>
            </div>
            <DetailList
              items={[
                {
                  label: "Servis No",
                  value: publicDisplayValue(result.serviceNumber || serviceNumber.trim()),
                },
                {
                  label: "Cihaz",
                  value: publicDisplayValue(deviceLabel || null),
                },
                {
                  label: "Durum",
                  value: publicServiceStatusLabel(result.status),
                },
                {
                  label: "Teknisyen",
                  value: publicDisplayValue(result.technicianName),
                },
                {
                  label: "Tahmini Tamamlanma",
                  value: publicFormatDateTime(result.estimatedCompletionAt),
                },
                {
                  label: "Son Güncelleme",
                  value: publicFormatDateTime(result.updatedAt),
                },
              ]}
            />
          </div>
        </Reveal>
      )}
    </div>
  );
}
