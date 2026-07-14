"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { SectionCard } from "@/components/ui/SectionCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { EmptyState } from "@/components/ui/EmptyState";
import { deviceService } from "@/services/deviceService";
import { warrantyService } from "@/services/warrantyService";
import { Device } from "@/types/device";
import { WarrantyRecord, WarrantyType } from "@/types/warranty";
import { ApiError } from "@/types/api";
import { ShieldCheck } from "lucide-react";

const warrantyTypes: { value: WarrantyType; label: string }[] = [
  { value: "GENERAL", label: "Genel Garanti" },
  { value: "PARTS", label: "Parça Garantisi" },
  { value: "LABOR", label: "İşçilik Garantisi" },
];

export default function GarantiSorgulamaPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [deviceError, setDeviceError] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [imei, setImei] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedType, setSelectedType] = useState<WarrantyType>("GENERAL");
  const [checking, setChecking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState("");
  const [checkResult, setCheckResult] = useState<boolean | null>(null);
  const [generatedRecord, setGeneratedRecord] = useState<WarrantyRecord | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoadingDevices(true);
    setDeviceError("");
    try {
      const data = await deviceService.getAll();
      setDevices(data);
    } catch (err) {
      const apiErr = err as ApiError;
      setDeviceError(apiErr.message || "Cihazlar yüklenemedi");
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleSerialSearch = () => {
    if (!serialNumber.trim()) return;
    const found = devices.find(
      (d) => d.serialNumber.toLowerCase() === serialNumber.trim().toLowerCase()
    );
    if (found) {
      setSelectedDeviceId(String(found.id));
      setActionError("");
    } else {
      setActionError("Bu seri numarasına sahip cihaz bulunamadı.");
    }
  };

  const handleCheck = async () => {
    if (!selectedDeviceId) return;
    setChecking(true);
    setActionError("");
    setCheckResult(null);
    try {
      const isValid = await warrantyService.check(Number(selectedDeviceId), selectedType);
      setCheckResult(isValid);
    } catch (err) {
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "Garanti sorgulanamadı");
    } finally {
      setChecking(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedDeviceId) return;
    setGenerating(true);
    setActionError("");
    try {
      const record = await warrantyService.generate(Number(selectedDeviceId), selectedType);
      setGeneratedRecord(record);
      setCheckResult(true);
    } catch (err) {
      const apiErr = err as ApiError;
      setActionError(apiErr.message || "Garanti kaydı oluşturulamadı");
    } finally {
      setGenerating(false);
    }
  };

  const selectedDevice = devices.find((d) => String(d.id) === selectedDeviceId);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        title="Garanti Sorgulama"
        description="Cihaz garanti durumunu hızlıca kontrol edin"
        icon={<ShieldCheck className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Cihaz Bilgileri" description="Seri numarası veya listeden cihaz seçin">
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    label="Seri Numarası"
                    placeholder="Cihaz seri numarasını girin"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-primary-300 hover:text-primary-600"
                  aria-label="Barkod tara"
                  disabled
                  title="Barkod okuma henüz desteklenmiyor"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h2m14 0h2M6 20h2M6 4h2v4H6V4z"
                    />
                  </svg>
                </button>
              </div>

              <Input
                label="IMEI"
                placeholder="IMEI numarası (bilgi alanı; API alanı değil)"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                disabled
              />
              <p className="text-xs text-slate-500">IMEI alanı görsel amaçlıdır; backend bu alanı kabul etmez.</p>

              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={handleSerialSearch} disabled={!serialNumber.trim()}>
                  Seri No ile Bul
                </Button>
              </div>

              {loadingDevices ? (
                <LoadingSpinner />
              ) : deviceError ? (
                <ErrorMessage message={deviceError} />
              ) : (
                <>
                  <div>
                    <label htmlFor="device" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Kayıtlı Cihaz
                    </label>
                    <select
                      id="device"
                      value={selectedDeviceId}
                      onChange={(e) => {
                        setSelectedDeviceId(e.target.value);
                        setCheckResult(null);
                        setGeneratedRecord(null);
                      }}
                      className="field-base"
                    >
                      <option value="">Cihaz seçin</option>
                      {devices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.serialNumber} — {d.customer?.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="type" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Garanti Tipi
                    </label>
                    <select
                      id="type"
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value as WarrantyType)}
                      className="field-base"
                    >
                      {warrantyTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleCheck} loading={checking} disabled={!selectedDeviceId}>
                      Garanti Sorgula
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleGenerate}
                      loading={generating}
                      disabled={!selectedDeviceId}
                    >
                      Garanti Kaydı Oluştur
                    </Button>
                  </div>
                </>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Sorgu Sonucu">
            {actionError && <ErrorMessage message={actionError} className="mb-4" />}

            {checkResult === null && !generatedRecord ? (
              <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                <svg className="mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <p className="text-sm text-slate-500">Sorgu sonucu burada görüntülenecek</p>
              </div>
            ) : (
              <div className="space-y-4">
                {checkResult !== null && (
                  <div
                    className={`rounded-xl border p-6 ${
                      checkResult ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant={checkResult ? "success" : "danger"}>
                        {checkResult ? "Garanti Kapsamında" : "Garanti Dışı"}
                      </Badge>
                      {selectedDevice && (
                        <span className="text-sm text-slate-600">{selectedDevice.serialNumber}</span>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-slate-700">
                      {checkResult
                        ? "Seçilen garanti tipi için aktif kayıt bulundu."
                        : "Seçilen tip için aktif garanti kaydı yok veya süresi dolmuş."}
                    </p>
                  </div>
                )}

                {generatedRecord && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-900">Oluşturulan Garanti Kaydı</h4>
                    <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-slate-500">Tip</dt>
                        <dd className="text-sm font-medium text-slate-900">{generatedRecord.warrantyType}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Açıklama</dt>
                        <dd className="text-sm font-medium text-slate-900">
                          {generatedRecord.description || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Başlangıç</dt>
                        <dd className="text-sm font-medium text-slate-900">{generatedRecord.startDate}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Bitiş</dt>
                        <dd className="text-sm font-medium text-slate-900">{generatedRecord.endDate}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Son Sorgular" description="Geçmiş sorgu kayıtları">
          <EmptyState
            title="Veri yok"
            description="Bu modül backend API'si tamamlandığında aktif olacaktır"
          />
        </SectionCard>
      </div>
    </div>
  );
}
