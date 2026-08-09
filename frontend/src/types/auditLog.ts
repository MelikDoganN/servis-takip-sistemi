import { PageResponse } from "./api";

/** Backend AuditLogDto sözleşmesi */
export interface AuditLog {
  id: number;
  createdAt: string;
  actorUserId: number | null;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string | null;
  entityId: number | null;
  entityDisplay: string | null;
  description: string;
  source: string;
  ipAddress: string | null;
  success: boolean;
  metadata: Record<string, unknown> | null;
}

export type AuditLogPage = PageResponse<AuditLog>;

export type AuditSource = "WEB" | "WHATSAPP" | "SYSTEM";

export interface AuditLogFilters {
  page?: number;
  size?: number;
  action?: string;
  entityType?: string;
  actorUserId?: number;
  source?: string;
  success?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}
