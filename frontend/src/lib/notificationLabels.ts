import {
  NotificationChannel,
  NotificationDto,
  NotificationStatus,
  NotificationType,
  RelatedEntityType,
} from "@/types/notification";

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  WORK_ORDER_CREATED: "İş Emri Oluşturuldu",
  TECHNICIAN_ASSIGNED: "Teknisyen Atandı",
  STATUS_CHANGED: "Durum Güncellendi",
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

export function notificationTypeLabel(type: NotificationType): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? type;
}

export function notificationStatusLabel(status: NotificationStatus): string {
  return NOTIFICATION_STATUS_LABELS[status] ?? status;
}

export function notificationChannelLabel(channel: NotificationChannel): string {
  return NOTIFICATION_CHANNEL_LABELS[channel] ?? channel;
}

/** Teknik ID göstermeden ilgili liste sayfasına yönlendir. */
export function notificationHref(n: NotificationDto): string | null {
  const entity = n.relatedEntityType as RelatedEntityType | null;
  const id = n.relatedEntityId;
  switch (entity) {
    case "WORK_ORDER":
      return id != null ? `/is-emirleri?id=${id}` : "/is-emirleri";
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
