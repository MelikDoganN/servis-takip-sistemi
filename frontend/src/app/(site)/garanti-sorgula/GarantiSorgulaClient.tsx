"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DetailList } from "@/components/ui/DetailList";
import { Reveal } from "@/components/site/Reveal";
import { formatDate } from "@/lib/utils";
import {
  WarrantyDeviceInfo,
  warrantyStatusLabel,
} from "@/types/warranty";

function apiBase(): string {
  if (typeof window !== "undefined") return "";
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
}

export default function GarantiSorgulaClient() {
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<WarrantyDeviceInfo | null>(null);

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
      const response = await fetch(
        `${apiBase()}/api/warranty/device/${encodeURIComponent(value)}`,
        { headers: { Accept: "application/json" }, cache: "no-store" }
      );
      if (response.status === 404) {
        setError("Bu seri numarası ile kayıtlı cihaz bulunamadı.");
        return;
      }
      if (response.status === 401 || response.status === 403) {
        setError(
          "Garanti sorgusu şu an yalnızca yetkili kanallar üzerinden yapılabiliyor. Lütfen WhatsApp veya servis noktamız ile iletişime geçin."
        );
        return;
      }
      if (!response.ok) {
        setError("Garanti bilgisi alınamadı. Lütfen daha sonra tekrar deneyin.");
        return;
      }
      const data = (await response.json()) as WarrantyDeviceInfo;
      setResult(data);
    } catch {
      setError("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const status = (result?.warrantyStatus || "").toUpperCase();

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
            />
          </div>
          <Button type="submit" loading={loading} disabled={loading} className="w-full sm:w-auto">
            Sorgula
          </Button>
          {error && (
            <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {error}
            </p>
          )}
        </form>
      </Reveal>

      {result && (
        <Reveal delayMs={40}>
          <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-navy">Sorgu Sonucu</h2>
              <Badge
                variant={
                  status === "AKTIF"
                    ? "success"
                    : status === "SURESI_DOLMUS"
                      ? "danger"
                      : "neutral"
                }
              >
                {warrantyStatusLabel(result.warrantyStatus)}
              </Badge>
            </div>
            <DetailList
              items={[
                {
                  label: "Cihaz",
                  value: result.deviceName || result.model || "—",
                },
                { label: "Marka", value: result.brand || "—" },
                { label: "Model", value: result.model || "—" },
                { label: "Seri No", value: result.serialNumber || serial.trim() },
                {
                  label: "Garanti Başlangıç",
                  value: formatDate(result.warrantyStart),
                },
                {
                  label: "Garanti Bitiş",
                  value: formatDate(result.warrantyEnd),
                },
                {
                  label: "Durum",
                  value: warrantyStatusLabel(result.warrantyStatus),
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
