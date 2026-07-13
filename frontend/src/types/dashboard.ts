export interface DashboardStats {
  totalCustomers: number;
  totalDevices: number;
  openWorkOrders: number | null;
  waitingParts: number | null;
}

export interface DashboardStatMeta {
  key: keyof DashboardStats;
  label: string;
  pending?: boolean;
}
