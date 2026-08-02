import { apiClient } from "./api";
import {
  BotHealthDto,
  BotInteractionPage,
} from "@/types/notification";

export interface BotInteractionFilters {
  direction?: string;
  status?: string;
  eventType?: string;
  page?: number;
  size?: number;
}

export const botOpsService = {
  getHealth(signal?: AbortSignal): Promise<BotHealthDto> {
    return apiClient<BotHealthDto>("/api/bot/health", { signal });
  },

  getInteractions(
    filters: BotInteractionFilters = {},
    signal?: AbortSignal
  ): Promise<BotInteractionPage> {
    const params = new URLSearchParams();
    params.set("page", String(filters.page ?? 0));
    params.set("size", String(filters.size ?? 20));
    if (filters.direction) params.set("direction", filters.direction);
    if (filters.status) params.set("status", filters.status);
    if (filters.eventType) params.set("eventType", filters.eventType);
    return apiClient<BotInteractionPage>(
      `/api/bot/interactions?${params.toString()}`,
      { signal }
    );
  },
};
