import type { AuditLog } from "@/types/auditLog";

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Başarılı Giriş",
  LOGIN_FAILED: "Başarısız Giriş",
  CUSTOMER_CREATED: "Müşteri Oluşturuldu",
  CUSTOMER_UPDATED: "Müşteri Güncellendi",
  CUSTOMER_DELETED: "Müşteri Silindi",
  DEVICE_CREATED: "Cihaz Oluşturuldu",
  DEVICE_UPDATED: "Cihaz Güncellendi",
  DEVICE_DELETED: "Cihaz Silindi",
  WORK_ORDER_CREATED: "İş Emri Oluşturuldu",
  TECHNICIAN_ASSIGNED: "Teknisyen Atandı",
  WORK_ORDER_STATUS_CHANGED: "İş Emri Durumu Değişti",
  WORK_ORDER_CANCELLED: "İş Emri İptal Edildi",
  TECHNICIAN_CREATED: "Teknisyen Oluşturuldu",
  TECHNICIAN_UPDATED: "Teknisyen Güncellendi",
  TECHNICIAN_DELETED: "Teknisyen Silindi",
  WARRANTY_CREATED: "Garanti Oluşturuldu",
  WARRANTY_UPDATED: "Garanti Güncellendi",
  WHATSAPP_SENT: "WhatsApp Gönderildi",
  WHATSAPP_FAILED: "WhatsApp Başarısız",
};

const SOURCE_LABELS: Record<string, string> = {
  WEB: "Panel",
  WHATSAPP: "WhatsApp",
  SYSTEM: "Sistem",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  AUTH: "Kimlik Doğrulama",
  CUSTOMER: "Müşteri",
  DEVICE: "Cihaz",
  WORK_ORDER: "İş Emri",
  TECHNICIAN: "Teknisyen",
  WARRANTY: "Garanti",
  WHATSAPP: "WhatsApp",
};

const SENSITIVE_META_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "apikey",
  "api_key",
  "jwt",
  "access_token",
  "accesstoken",
  "bot_password",
  "botpassword",
];

export const AUDIT_ACTION_OPTIONS = Object.entries(ACTION_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const AUDIT_SOURCE_OPTIONS = [
  { value: "WEB", label: "Panel" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "SYSTEM", label: "Sistem" },
];

export const AUDIT_ENTITY_TYPE_OPTIONS = Object.entries(ENTITY_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);

export function auditActionLabel(action: string | null | undefined): string {
  if (!action) return "—";
  const known = ACTION_LABELS[action];
  if (known) return known;
  return titleCaseFallback(action);
}

export function auditSourceLabel(source: string | null | undefined): string {
  if (!source) return "—";
  return SOURCE_LABELS[source.toUpperCase()] || titleCaseFallback(source);
}

export function auditEntityTypeLabel(entityType: string | null | undefined): string {
  if (!entityType) return "—";
  return ENTITY_TYPE_LABELS[entityType.toUpperCase()] || titleCaseFallback(entityType);
}

function titleCaseFallback(raw: string): string {
  return raw
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function isSensitiveMetaKey(key: string): boolean {
  const norm = key.toLowerCase().replace(/[-_]/g, "");
  return SENSITIVE_META_KEYS.some((s) => norm.includes(s.replace(/[-_]/g, "")));
}

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | null | undefined
): Array<{ key: string; value: string }> {
  if (!metadata || typeof metadata !== "object") return [];
  return Object.entries(metadata).map(([key, value]) => {
    if (isSensitiveMetaKey(key)) {
      return { key, value: "••••••••" };
    }
    if (value == null) return { key, value: "—" };
    if (typeof value === "object") {
      try {
        return { key, value: JSON.stringify(value) };
      } catch {
        return { key, value: String(value) };
      }
    }
    return { key, value: String(value) };
  });
}

/** Desteklenen mevcut route'lara deep link */
export function auditEntityHref(log: AuditLog): string | null {
  const type = (log.entityType || "").toUpperCase();
  const display = log.entityDisplay?.trim() || "";

  if (type === "WORK_ORDER") {
    if (/^SRV-\d{4}-\d+/i.test(display)) {
      return `/is-emirleri?serviceNo=${encodeURIComponent(display)}`;
    }
    if (log.entityId != null) {
      return `/is-emirleri?id=${log.entityId}`;
    }
  }

  if (type === "CUSTOMER" && display) {
    return `/musteriler?q=${encodeURIComponent(display)}`;
  }

  if (type === "TECHNICIAN" && display) {
    return `/teknisyenler?q=${encodeURIComponent(display)}`;
  }

  return null;
}

export function localDateInputValue(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isSameLocalDay(iso: string | null | undefined, day = localDateInputValue()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return localDateInputValue(d) === day;
}
