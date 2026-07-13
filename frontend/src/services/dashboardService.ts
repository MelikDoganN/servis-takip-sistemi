import { DashboardStats } from "@/types/dashboard";
import { customerService } from "./customerService";
import { deviceService } from "./deviceService";

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const [customers, devices] = await Promise.all([
      customerService.getAll(),
      deviceService.getAll(),
    ]);

    return {
      totalCustomers: customers.length,
      totalDevices: devices.length,
      openWorkOrders: null,
      waitingParts: null,
    };
  },
};
