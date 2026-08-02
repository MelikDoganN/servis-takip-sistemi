import { apiClient, apiDownload } from "./api";
import { PageResponse } from "@/types/api";
import {
  CreateWorkOrderRequest,
  KanbanBoard,
  UpdateWorkOrderStatusOptions,
  WhatsAppOutboxItem,
  WorkOrder,
  WorkOrderAttachment,
  WorkOrderLifecycleUpdate,
  WorkOrderStatus,
  WorkOrderStatusHistory,
  WorkOrderTimelineEvent,
} from "@/types/workOrder";

function unwrapContent<T>(data: PageResponse<T> | T[]): T[] {
  if (Array.isArray(data)) return data;
  return data.content ?? [];
}

export const workOrderService = {
  getPage(
    page = 0,
    size = 10,
    status?: WorkOrderStatus | ""
  ): Promise<PageResponse<WorkOrder>> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (status) params.set("status", status);
    return apiClient<PageResponse<WorkOrder>>(`/api/workorders?${params}`);
  },

  async getAll(
    size = 1000,
    status?: WorkOrderStatus | ""
  ): Promise<WorkOrder[]> {
    const params = new URLSearchParams({
      page: "0",
      size: String(size),
    });
    if (status) params.set("status", status);

    const data = await apiClient<PageResponse<WorkOrder> | WorkOrder[]>(
      `/api/workorders?${params}`
    );
    return unwrapContent(data);
  },

  getById(id: number): Promise<WorkOrder> {
    return apiClient<WorkOrder>(`/api/workorders/${id}`);
  },

  getByServiceNumber(serviceNumber: string): Promise<WorkOrder> {
    return apiClient<WorkOrder>(
      `/api/workorders/by-service-number/${encodeURIComponent(serviceNumber)}`
    );
  },

  create(data: CreateWorkOrderRequest): Promise<WorkOrder> {
    return apiClient<WorkOrder>("/api/workorders", {
      method: "POST",
      body: data,
    });
  },

  updateStatus(
    id: number,
    status: WorkOrderStatus,
    options: UpdateWorkOrderStatusOptions = {}
  ): Promise<WorkOrder> {
    const params = new URLSearchParams({
      status,
      channel: options.channel || "WEB",
    });
    if (options.cancellationReason) {
      params.set("cancellationReason", options.cancellationReason);
    }
    if (options.resolutionNote) {
      params.set("resolutionNote", options.resolutionNote);
    }
    if (options.deliveryNote) {
      params.set("deliveryNote", options.deliveryNote);
    }
    if (options.estimatedCompletionAt) {
      params.set("estimatedCompletionAt", options.estimatedCompletionAt);
    }
    return apiClient<WorkOrder>(`/api/workorders/${id}/status?${params}`, {
      method: "PUT",
    });
  },

  updateLifecycle(
    id: number,
    data: WorkOrderLifecycleUpdate
  ): Promise<WorkOrder> {
    return apiClient<WorkOrder>(`/api/workorders/${id}/lifecycle`, {
      method: "PUT",
      body: data,
    });
  },

  assign(id: number, technicianId: number): Promise<WorkOrder> {
    return apiClient<WorkOrder>(
      `/api/workorders/${id}/assign/${technicianId}`,
      { method: "PUT" }
    );
  },

  getKanban(): Promise<KanbanBoard> {
    return apiClient<KanbanBoard>("/api/workorders/kanban");
  },

  getHistory(id: number): Promise<WorkOrderStatusHistory[]> {
    return apiClient<WorkOrderStatusHistory[]>(
      `/api/workorders/${id}/history`
    );
  },

  getTimeline(id: number): Promise<WorkOrderTimelineEvent[]> {
    return apiClient<WorkOrderTimelineEvent[]>(
      `/api/workorders/${id}/timeline`
    );
  },

  getWhatsAppOutbox(id: number): Promise<WhatsAppOutboxItem[]> {
    return apiClient<WhatsAppOutboxItem[]>(
      `/api/workorders/${id}/whatsapp-outbox`
    );
  },

  retryFailedWhatsApp(id: number): Promise<{
    workOrderId: number;
    requeuedCount: number;
    items: WhatsAppOutboxItem[];
  }> {
    return apiClient(`/api/workorders/${id}/whatsapp/retry`, {
      method: "POST",
    });
  },

  retryWhatsAppOutbox(
    id: number,
    outboxId: number
  ): Promise<WhatsAppOutboxItem> {
    return apiClient(
      `/api/workorders/${id}/whatsapp-outbox/${outboxId}/retry`,
      { method: "POST" }
    );
  },

  getAttachments(id: number): Promise<WorkOrderAttachment[]> {
    return apiClient<WorkOrderAttachment[]>(
      `/api/workorders/${id}/attachments`
    );
  },

  uploadFile(id: number, file: File): Promise<WorkOrderAttachment> {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient<WorkOrderAttachment>(`/api/workorders/${id}/upload`, {
      method: "POST",
      body: formData,
    });
  },

  downloadPdf(id: number): Promise<void> {
    return apiDownload(
      `/api/workorders/${id}/pdf`,
      `workorder_${id}.pdf`
    );
  },
};
