"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { deviceService } from "@/services/deviceService";
import { warrantyService } from "@/services/warrantyService";
import { Device } from "@/types/device";
import { WarrantyType } from "@/types/warranty";
import { ApiError } from "@/types/api";

const warrantyTypes: { value: WarrantyType; label: string }[] = [
  { value: "GENERAL", label: "Genel Garanti" },
  { value: "PARTS", label: "Parça Garantisi" },
  { value: "LABOR", label: "İşçilik Garantisi" },
];

export default function GarantiSorgulamaPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [deviceError, setDeviceError] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedType, setSelectedType] = useState<WarrantyType>("GENERAL");
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [result, setResult] = useState<boolean | null>(null);

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

  const handleCheck = async () => {
    if (!selectedDeviceId) return;
    setChecking(true);
    setCheckError("");
    setResult(null);
    try {
      const isValid = await warrantyService.check(Number(selectedDeviceId), selectedType);
      setResult(isValid);
    } catch (err) {
      const apiErr = err as ApiError;
      setCheckError(apiErr.message || "Garanti sorgulanamadı");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Garanti Sorgulama"
        description="Cihaz ve garanti tipi seçerek garanti durumunu sorgulayın"
      />

      <Card>
        <CardHeader>
          <CardTitle>Sorgulama</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDevices ? (
            <LoadingSpinner />
          ) : deviceError ? (
            <ErrorMessage message={deviceError} />
          ) : devices.length === 0 ? (
            <p className="text-sm text-gray-500">Sorgulama için önce cihaz kaydı oluşturun</p>
          ) : (
            <div className="flex max-w-2xl flex-col gap-4">
              <div>
                <label htmlFor="device" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Cihaz
                </label>
                <select
                  id="device"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
                <label htmlFor="type" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Garanti Tipi
                </label>
                <select
                  id="type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as WarrantyType)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {warrantyTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <Button onClick={handleCheck} loading={checking} disabled={!selectedDeviceId}>
                Sorgula
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Garanti Sonucu</CardTitle>
        </CardHeader>
        <CardContent>
          {checkError && <ErrorMessage message={checkError} className="mb-4" />}
          {result === null ? (
            <p className="text-sm text-gray-400">Sorgulama yapmak için cihaz ve garanti tipi seçin</p>
          ) : (
            <p className={`text-sm font-medium ${result ? "text-green-700" : "text-red-700"}`}>
              {result ? "Garanti kapsamında" : "Garanti süresi dolmuş veya kayıt bulunamadı"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
