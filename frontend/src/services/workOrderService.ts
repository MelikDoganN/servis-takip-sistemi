import { apiClient } from "./api";
import { PageResponse } from "@/types/api";
import {
  CreateWorkOrderRequest,
  KanbanBoard,
  WorkOrder,
  WorkOrderStatus,
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

  create(data: CreateWorkOrderRequest): Promise<WorkOrder> {
    return apiClient<WorkOrder>("/api/workorders", {
      method: "POST",
      body: data,
    });
  },

  updateStatus(
    id: number,
    status: WorkOrderStatus,
    channel = "WEB"
  ): Promise<WorkOrder> {
    const params = new URLSearchParams({
      status,
      channel,
    });
    return apiClient<WorkOrder>(`/api/workorders/${id}/status?${params}`, {
      method: "PUT",
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
};
