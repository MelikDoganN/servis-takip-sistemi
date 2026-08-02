import {
  NotificationChannel,
  NotificationDto,
  NotificationStatus,
  NotificationType,
  RelatedEntityType,
} from "@/types/notification";
import { WORK_ORDER_STATUS_LABELS, WorkOrderStatus } from "@/types/workOrder";

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  WORK_ORDER_CREATED: "İş Emri Oluşturuldu",
  TECHNICIAN_ASSIGNED: "Teknisyen Atandı",
  STATUS_CHANGED: "Durum Güncellendi",
  READY_FOR_DELIVERY: "Teslime Hazır",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal Edildi",
  WORK_ORDER_READY_FOR_DELIVERY: "Teslime Hazır",
  WORK_ORDER_DELIVERED: "Teslim Edildi",
  WORK_ORDER_CANCELLED: "İptal Edildi",
  WARRANTY_WARNING: "Garanti Uyarısı",
  SYSTEM: "Sistem",
};

export const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Bekliyor",
  SENT: "Gönderildi",
  FAILED: "Başarısız",
  SKIPPED: "Atlandı",
};

export const NOTIFICATION_CHANNEL_LABELS: Record<string, string> = {
  IN_APP: "Uygulama",
  WHATSAPP: "WhatsApp",
};

const STATUS_TOKEN_LABELS: Record<string, string> = {
  READY_FOR_DELIVERY: WORK_ORDER_STATUS_LABELS.READY_FOR_DELIVERY,
  DELIVERED: WORK_ORDER_STATUS_LABELS.DELIVERED,
  CANCELLED: WORK_ORDER_STATUS_LABELS.CANCELLED,
  OPEN: WORK_ORDER_STATUS_LABELS.OPEN,
  ASSIGNED: WORK_ORDER_STATUS_LABELS.ASSIGNED,
  IN_PROGRESS: WORK_ORDER_STATUS_LABELS.IN_PROGRESS,
  WAITING_PARTS: WORK_ORDER_STATUS_LABELS.WAITING_PARTS,
  RESOLVED: WORK_ORDER_STATUS_LABELS.RESOLVED,
  CLOSED: WORK_ORDER_STATUS_LABELS.CLOSED,
};

export function notificationTypeLabel(type: NotificationType): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? type;
}

export function notificationStatusLabel(status: NotificationStatus): string {
  return NOTIFICATION_STATUS_LABELS[status] ?? status;
}

export function notificationChannelLabel(channel: NotificationChannel): string {
  return NOTIFICATION_CHANNEL_LABELS[channel] ?? channel;
}

/** Bildirim başlık/mesajındaki teknik durum kodlarını Türkçeleştirir. */
export function localizeNotificationText(
  text: string | null | undefined
): string {
  if (!text) return "";
  let out = text;
  for (const [token, label] of Object.entries(STATUS_TOKEN_LABELS)) {
    out = out.replace(new RegExp(`\\b${token}\\b`, "g"), label);
  }
  return out;
}

export function notificationDisplayTitle(n: NotificationDto): string {
  const localized = localizeNotificationText(n.title);
  if (localized) return localized;
  return notificationTypeLabel(n.type);
}

export function notificationDisplayMessage(n: NotificationDto): string {
  return localizeNotificationText(n.message);
}

export function workOrderStatusLabelSafe(status: string | null | undefined): string {
  if (!status) return "—";
  return WORK_ORDER_STATUS_LABELS[status as WorkOrderStatus] ?? status;
}

/** Teknik ID göstermeden ilgili liste sayfasına yönlendir. */
export function notificationHref(n: NotificationDto): string | null {
  const entity = n.relatedEntityType as RelatedEntityType | null;
  const id = n.relatedEntityId;
  switch (entity) {
    case "WORK_ORDER": {
      // Mesajdaki Servis No varsa serviceNo deep-link; yoksa id
      const fromMessage = extractServiceNumber(n.message);
      if (fromMessage) {
        return `/is-emirleri?serviceNo=${encodeURIComponent(fromMessage)}`;
      }
      return id != null ? `/is-emirleri?id=${id}` : "/is-emirleri";
    }
    case "DEVICE":
      return id != null ? `/cihazlar?id=${id}` : "/cihazlar";
    case "CUSTOMER":
      return id != null ? `/musteriler?id=${id}` : "/musteriler";
    case "USER":
      return id != null ? `/kullanici-yonetimi?id=${id}` : "/kullanici-yonetimi";
    default:
      return null;
  }
}

const SERVICE_NO_RE = /SRV-\d{4}-\d{6,}/i;

export function extractServiceNumber(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(SERVICE_NO_RE);
  return m ? m[0].toUpperCase() : null;
}
