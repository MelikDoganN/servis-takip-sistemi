import { apiClient } from "./api";

export interface WorkOrderSummaryReport {
  total: number;
  open: number;
  assigned: number;
  waitingParts: number;
  resolved: number;
  closed: number;
}

export const reportService = {
  getWorkOrderSummary(
    startDate?: string,
    endDate?: string
  ): Promise<WorkOrderSummaryReport> {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString();
    return apiClient<WorkOrderSummaryReport>(
      `/api/reports/workorder-summary${qs ? `?${qs}` : ""}`
    );
  },
};
