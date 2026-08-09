import { apiClient } from "./api";
import { AuditLog, AuditLogFilters, AuditLogPage } from "@/types/auditLog";

function buildQuery(filters: AuditLogFilters): string {
  const params = new URLSearchParams();
  params.set("page", String(filters.page ?? 0));
  params.set("size", String(filters.size ?? 20));
  if (filters.action) params.set("action", filters.action);
  if (filters.entityType) params.set("entityType", filters.entityType);
  if (filters.actorUserId != null) params.set("actorUserId", String(filters.actorUserId));
  if (filters.source) params.set("source", filters.source);
  if (filters.success !== undefined && filters.success !== null) {
    params.set("success", String(filters.success));
  }
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  return params.toString();
}

export const auditLogService = {
  getPage(filters: AuditLogFilters = {}, signal?: AbortSignal): Promise<AuditLogPage> {
    return apiClient<AuditLogPage>(`/api/audit-logs?${buildQuery(filters)}`, { signal });
  },

  getById(id: number, signal?: AbortSignal): Promise<AuditLog> {
    return apiClient<AuditLog>(`/api/audit-logs/${id}`, { signal });
  },
};
