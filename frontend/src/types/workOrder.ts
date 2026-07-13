import { Customer } from "./customer";
import { Device } from "./device";
import { Region } from "./region";
import { Technician } from "./technician";
import { User } from "./user";

export type WorkOrderStatus =
  | "OPENED"
  | "ASSIGNED"
  | "WAITING_PARTS"
  | "RESOLVED"
  | "CLOSED";

export type WorkOrderPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type ServiceType = "WARRANTY" | "PAID";

export interface WorkOrder {
  id: number;
  customer: Customer;
  device: Device;
  technician: Technician | null;
  createdByUser: User;
  region: Region;
  description: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  serviceType: ServiceType;
  assignedAt: string | null;
  waitingForPartsSince: string | null;
  completedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
