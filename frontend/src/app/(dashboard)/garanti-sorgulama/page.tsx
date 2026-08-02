"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { DetailList } from "@/components/ui/DetailList";
import { warrantyService } from "@/services/warrantyService";
import {
  WarrantyDeviceInfo,
  warrantyStatusLabel,
} from "@/types/warranty";
import { ApiError } from "@/types/api";
import { formatDate } from "@/lib/utils";
import { Search, ShieldCheck } from "lucide-react";

function statusBadgeVariant(
  status?: string | null
): "success" | "danger" | "warning" | "neutral" | "info" {
  switch ((status || "").toUpperCase()) {
    case "AKTIF":
      return "success";
    case "SURESI_DOLMUS":
      return "danger";
    case "TARIH_EKSIK":
      return "warning";
    case "TANIMLANMAMIS":
      return "neutral";
    default:
      return "info";
  }
}

export default function GarantiSorgulamaPage() {
  const [serialNumber, setSerialNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<WarrantyDeviceInfo | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const serial = serialNumber.trim();
    if (!serial) {
      setError("Seri numarası giriniz.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setSearched(true);
    try {
      const data = await warrantyService.getBySerial(serial);
      setResult(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(
        apiErr.message ||
          (apiErr.status === 404
            ? "Bu seri numarasıyla cihaz bulunamadı."
            : "Garanti sorgusu başarısız oldu")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Garanti Sorgulama"
        description="Seri numarası ile cihaz garanti durumunu kontrol edin"
        icon={<ShieldCheck className="h-5 w-5" />}
      />

      <SectionCard
        title="Seri Numarası ile Sorgula"
        description="Kayıtlı cihazın garanti durumunu seri numarası ile kontrol edin"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Seri Numarası"
              placeholder="Örn. SN-123456"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSearch();
                }
              }}
            />
          </div>
          <Button
            onClick={() => void handleSearch()}
            loading={loading}
            className="sm:mb-0"
            aria-label="Garanti sorgula"
          >
            <Search className="mr-1.5 h-4 w-4" />
            Sorgula
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Sorgu Sonucu">
        {error && <ErrorMessage message={error} className="mb-4" />}

        {!searched && !error ? (
          <EmptyState
            title="Henüz sorgu yapılmadı"
            description="Cihazın seri numarasını girerek garanti durumunu görüntüleyin."
            icon={<ShieldCheck className="h-5 w-5" />}
          />
        ) : result ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={statusBadgeVariant(result.warrantyStatus)}>
                {warrantyStatusLabel(result.warrantyStatus)}
              </Badge>
              <span className="text-sm text-slate-500">
                {result.serialNumber || serialNumber}
              </span>
            </div>

            {(result.warrantyStatus || "").toUpperCase() === "TARIH_EKSIK" && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Cihazda satın alma veya kurulum tarihi bulunmadığı için garanti bitiş
                tarihi hesaplanamıyor. Tarihleri cihaz kaydına ekleyin.
              </p>
            )}

            <DetailList
              items={[
                { label: "Müşteri", value: result.customerName || "—" },
                { label: "Marka", value: result.brand || "—" },
                { label: "Model", value: result.model || "—" },
                { label: "Seri Numarası", value: result.serialNumber || "—" },
                {
                  label: "Garanti Durumu",
                  value: warrantyStatusLabel(result.warrantyStatus),
                },
                {
                  label: "Başlangıç",
                  value: formatDate(result.warrantyStart),
                },
                {
                  label: "Bitiş",
                  value: formatDate(result.warrantyEnd),
                },
              ]}
            />
          </div>
        ) : searched && !loading && !error ? (
          <EmptyState
            title="Sonuç bulunamadı"
            description="Bu seri numarası için görüntülenecek bilgi yok."
          />
        ) : null}
      </SectionCard>
    </div>
  );
}
