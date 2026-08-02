/** GET /api/dashboard/kpi — backend gerçek alan adları */
export interface DashboardStats {
  totalWorkOrders: number;
  openWorkOrders: number;
  resolvedWorkOrders: number;
  closedWorkOrders: number;
  totalCustomers: number;
  totalDevices: number;
  openedToday: number;
  completedToday: number;
  readyForDelivery: number;
  waitingParts: number;
  inProgress: number;
  averageResolutionHours: number;
}
