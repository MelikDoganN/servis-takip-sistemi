import { Customer } from "./customer";
import { Device } from "./device";
import { Technician } from "./technician";
import { User } from "./user";

/** Backend WorkOrderStatus enum ile birebir */
export type WorkOrderStatus =
  | "OPEN"
  | "ASSIGNED"
  | "WAITING_PARTS"
  | "RESOLVED"
  | "CLOSED";

export type WorkOrderPriority = "LOW" | "MEDIUM" | "HIGH";

export type ServiceType = "WARRANTY" | "PAID";

export const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  "OPEN",
  "ASSIGNED",
  "WAITING_PARTS",
  "RESOLVED",
  "CLOSED",
];

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  OPEN: "Açık",
  ASSIGNED: "Atandı",
  WAITING_PARTS: "Parça Bekliyor",
  RESOLVED: "Çözüldü",
  CLOSED: "Kapalı",
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

/** Backend state machine geçişleri */
export const WORK_ORDER_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  OPEN: ["ASSIGNED", "CLOSED"],
  ASSIGNED: ["WAITING_PARTS", "RESOLVED"],
  WAITING_PARTS: ["ASSIGNED", "RESOLVED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

export interface WorkOrder {
  id: number;
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
  closedAt: string | null;
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

export interface WorkOrderAttachment {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: User | null;
  createdAt: string;
}