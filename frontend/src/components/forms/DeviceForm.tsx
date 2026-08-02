"use client";

import { FormEvent, useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { CreateDeviceRequest, Device } from "@/types/device";
import { Customer } from "@/types/customer";
import { Brand } from "@/types/brand";
import { DeviceModel } from "@/types/deviceModel";
import { brandService } from "@/services/brandService";
import { deviceModelService } from "@/services/deviceModelService";
import { ApiError } from "@/types/api";

interface DeviceFormProps {
  customers: Customer[];
  initialValues?: Device;
  submitLabel?: string;
  onSubmit: (data: CreateDeviceRequest) => Promise<void>;
  onCancel: () => void;
}

interface FormErrors {
  customerId?: string;
  brandId?: string;
  modelId?: string;
  serialNumber?: string;
}

export function DeviceForm({
  customers,
  initialValues,
  submitLabel = "Kaydet",
  onSubmit,
  onCancel,
}: DeviceFormProps) {
  const [customerId, setCustomerId] = useState(
    initialValues?.customer?.id ? String(initialValues.customer.id) : ""
  );
  const [brandId, setBrandId] = useState(
    initialValues?.model?.brand?.id ? String(initialValues.model.brand.id) : ""
  );
  const [modelId, setModelId] = useState(
    initialValues?.model?.id ? String(initialValues.model.id) : ""
  );
  const [serialNumber, setSerialNumber] = useState(initialValues?.serialNumber ?? "");
  const [purchaseDate, setPurchaseDate] = useState(initialValues?.purchaseDate ?? "");
  const [installationDate, setInstallationDate] = useState(
    initialValues?.installationDate ?? ""
  );
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    setCustomerId(initialValues?.customer?.id ? String(initialValues.customer.id) : "");
    setBrandId(
      initialValues?.model?.brand?.id ? String(initialValues.model.brand.id) : ""
    );
    setModelId(initialValues?.model?.id ? String(initialValues.model.id) : "");
    setSerialNumber(initialValues?.serialNumber ?? "");
    setPurchaseDate(initialValues?.purchaseDate ?? "");
    setInstallationDate(initialValues?.installationDate ?? "");
  }, [initialValues]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLookupsLoading(true);
      setLookupError("");
      try {
        const data = await brandService.getAll();
        if (!cancelled) setBrands(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          const apiErr = err as ApiError;
          setLookupError(apiErr.message || "Markalar yüklenemedi");
          setBrands([]);
        }
      } finally {
        if (!cancelled) setLookupsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setModelsLoading(true);
      setLookupError("");
      try {
        const data = await deviceModelService.getAll(Number(brandId));
        if (!cancelled) {
          setModels(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          const apiErr = err as ApiError;
          setLookupError(apiErr.message || "Modeller yüklenemedi");
          setModels([]);
        }
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!customerId) newErrors.customerId = "Müşteri seçilmelidir";
    if (!brandId) newErrors.brandId = "Marka seçilmelidir";
    if (!modelId) newErrors.modelId = "Model seçilmelidir";
    if (!serialNumber.trim()) newErrors.serialNumber = "Seri numarası zorunludur";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit({
        customer: { id: Number(customerId) },
        model: { id: Number(modelId) },
        serialNumber: serialNumber.trim(),
        purchaseDate: purchaseDate || undefined,
        installationDate: installationDate || undefined,
      });
    } catch (err) {
      const apiErr = err as { message?: string };
      setSubmitError(apiErr.message || "İşlem başarısız oldu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {lookupError && <ErrorMessage message={lookupError} />}

      <Select
        label="Müşteri"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        error={errors.customerId}
        required
      >
        <option value="">Müşteri seçin</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.fullName}
            {c.phone ? ` — ${c.phone}` : ""}
          </option>
        ))}
      </Select>

      <Select
        label="Marka"
        value={brandId}
        disabled={lookupsLoading}
        onChange={(e) => {
          setBrandId(e.target.value);
          setModelId("");
        }}
        error={errors.brandId}
        required
      >
        <option value="">
          {lookupsLoading ? "Markalar yükleniyor…" : "Marka seçin"}
        </option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>
      {!lookupsLoading && brands.length === 0 && !lookupError && (
        <p className="text-xs text-amber-700">
          Henüz marka kaydı yok. Yönetici marka ekledikten sonra cihaz kaydı açabilirsiniz.
        </p>
      )}

      <Select
        label="Model"
        value={modelId}
        disabled={!brandId || modelsLoading}
        onChange={(e) => setModelId(e.target.value)}
        error={errors.modelId}
        required
      >
        <option value="">
          {!brandId
            ? "Önce marka seçin"
            : modelsLoading
              ? "Modeller yükleniyor…"
              : "Model seçin"}
        </option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {m.deviceType ? ` (${m.deviceType})` : ""}
          </option>
        ))}
      </Select>
      {brandId && !modelsLoading && models.length === 0 && !lookupError && (
        <p className="text-xs text-amber-700">
          Bu markaya ait model bulunamadı.
        </p>
      )}

      <Input
        label="Seri Numarası"
        value={serialNumber}
        onChange={(e) => setSerialNumber(e.target.value)}
        error={errors.serialNumber}
        required
      />

      <Input
        label="Satın Alma Tarihi"
        type="date"
        value={purchaseDate || ""}
        onChange={(e) => setPurchaseDate(e.target.value)}
      />

      <Input
        label="Kurulum Tarihi"
        type="date"
        value={installationDate || ""}
        onChange={(e) => setInstallationDate(e.target.value)}
      />

      {submitError && <ErrorMessage message={submitError} />}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          İptal
        </Button>
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
