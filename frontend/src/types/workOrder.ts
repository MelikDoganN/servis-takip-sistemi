import { Customer } from "./customer";
import { Device } from "./device";
import { Technician } from "./technician";
import { User } from "./user";

/** Backend WorkOrderStatus enum ile birebir */
export type WorkOrderStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_PARTS"
  | "RESOLVED"
  | "READY_FOR_DELIVERY"
  | "DELIVERED"
  | "CLOSED"
  | "CANCELLED";

export type WorkOrderPriority = "LOW" | "MEDIUM" | "HIGH";

export type ServiceType = "WARRANTY" | "PAID";

export const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "RESOLVED",
  "READY_FOR_DELIVERY",
  "DELIVERED",
  "CLOSED",
  "CANCELLED",
];

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  OPEN: "Açık",
  ASSIGNED: "Teknisyen Atandı",
  IN_PROGRESS: "İşlemde",
  WAITING_PARTS: "Parça Bekliyor",
  RESOLVED: "İşlem Tamamlandı",
  READY_FOR_DELIVERY: "Teslime Hazır",
  DELIVERED: "Teslim Edildi",
  CLOSED: "Kapatıldı",
  CANCELLED: "İptal Edildi",
};

export const WORK_ORDER_PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  WARRANTY: "Garanti",
  PAID: "Ücretli",
};

/** Backend state machine geçişleri ile birebir */
export const WORK_ORDER_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  OPEN: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "WAITING_PARTS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_PARTS", "RESOLVED", "CANCELLED"],
  WAITING_PARTS: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["READY_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export type NotificationDeliveryStatus =
  | "PENDING"
  | "SENT"
  | "FAILED"
  | "SKIPPED"
  | "PROCESSING"
  | string;

export interface WorkOrder {
  id: number;
  serviceNumber: string;
  customer: Customer;
  device: Device;
  technician: Technician | null;
  createdBy: User;
  regionId: number | null;
  description: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority | null;
  serviceType: ServiceType | null;
  assignedAt: string | null;
  waitingForPartsSince: string | null;
  completedAt: string | null;
  resolvedAt: string | null;
  deliveredAt: string | null;
  closedAt: string | null;
  estimatedCompletionAt: string | null;
  customerNotifiedAt: string | null;
  deliveryNote: string | null;
  resolutionNote: string | null;
  cancellationReason: string | null;
  lastNotificationStatus: NotificationDeliveryStatus | null;
  lastWhatsappMessageId: string | null;
  customerNotificationCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkOrderRequest {
  customer: { id: number };
  device: { id: number };
  description: string;
  priority?: WorkOrderPriority;
  serviceType?: ServiceType;
  regionId?: number;
}

export interface WorkOrderLifecycleUpdate {
  cancellationReason?: string | null;
  resolutionNote?: string | null;
  deliveryNote?: string | null;
  estimatedCompletionAt?: string | null;
}

export interface UpdateWorkOrderStatusOptions extends WorkOrderLifecycleUpdate {
  channel?: string;
}

export type KanbanBoard = Partial<Record<WorkOrderStatus, WorkOrder[]>> &
  Record<string, WorkOrder[]>;

export interface WorkOrderStatusHistory {
  id: number;
  oldStatus: string | null;
  newStatus: string;
  description: string | null;
  channel: string | null;
  changedBy: User | null;
  createdAt: string;
}

/** GET /api/workorders/{id}/timeline */
export interface WorkOrderTimelineEvent {
  id: number;
  oldStatus: string | null;
  newStatus: string;
  description: string | null;
  channel: string | null;
  changedByUserId: number | null;
  changedByName: string | null;
  createdAt: string;
}

export interface WorkOrderAttachment {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: User | null;
  createdAt: string;
}

/** GET /api/workorders/{id}/whatsapp-outbox */
export interface WhatsAppOutboxItem {
  id: number;
  workOrderId: number | null;
  eventType: string;
  eventKey: string;
  recipientPhone: string;
  payload: string;
  attemptCount: number;
  nextAttemptAt: string | null;
  lastError: string | null;
  status: string;
  createdAt: string;
  sentAt: string | null;
}

export const WHATSAPP_OUTBOX_STATUS_LABELS: Record<string, string> = {
  PENDING: "Bekliyor",
  PROCESSING: "İşleniyor",
  SENT: "Gönderildi",
  FAILED: "Başarısız",
  SKIPPED: "Atlandı",
};
