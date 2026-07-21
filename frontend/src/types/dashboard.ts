/** GET /api/dashboard/kpi yanıtı */
export interface DashboardStats {
  totalWorkOrders: number;
  openWorkOrders: number;
  resolvedWorkOrders: number;
  closedWorkOrders: number;
  totalCustomers: number;
  totalDevices: number;
}
