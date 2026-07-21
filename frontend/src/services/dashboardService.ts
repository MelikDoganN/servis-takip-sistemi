import { apiClient } from "./api";
import { DashboardStats } from "@/types/dashboard";

export const dashboardService = {
  getStats(): Promise<DashboardStats> {
    return apiClient<DashboardStats>("/api/dashboard/kpi");
  },
};
