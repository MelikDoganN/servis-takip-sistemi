import { PageResponse } from "./api";

export type NotificationType =
  | "WORK_ORDER_CREATED"
  | "TECHNICIAN_ASSIGNED"
  | "STATUS_CHANGED"
  | "WARRANTY_WARNING"
  | "SYSTEM"
  | string;

export type NotificationChannel = "IN_APP" | "WHATSAPP" | string;

export type NotificationStatus =
  | "PENDING"
  | "SENT"
  | "FAILED"
  | "SKIPPED"
  | string;

export type RelatedEntityType =
  | "WORK_ORDER"
  | "DEVICE"
  | "CUSTOMER"
  | "USER"
  | string;

/** Backend NotificationDto ile birebir */
export interface NotificationDto {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: RelatedEntityType | null;
  relatedEntityId: number | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  read: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkAllReadResponse {
  updated: number;
}

export type NotificationPage = PageResponse<NotificationDto>;

export interface BotHealthDto {
  botUrlConfigured: boolean;
  botReachable: boolean;
  botStatus: string;
  lastSuccessfulSendAt: string | null;
  lastFailedSendAt: string | null;
  pendingOutboxCount: number;
  failedOutboxCount: number;
}

export interface BotInteractionLogDto {
  id: number;
  direction: string | null;
  phoneMasked: string | null;
  messageType: string | null;
  command: string | null;
  eventType: string | null;
  status: string | null;
  workOrderId: number | null;
  messageSummary: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export type BotInteractionPage = PageResponse<BotInteractionLogDto>;
