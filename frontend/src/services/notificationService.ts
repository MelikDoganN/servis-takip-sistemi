import { apiClient } from "./api";
import {
  MarkAllReadResponse,
  NotificationDto,
  NotificationPage,
  UnreadCountResponse,
} from "@/types/notification";

export const notificationService = {
  getNotifications(
    page = 0,
    size = 10,
    isRead?: boolean,
    signal?: AbortSignal
  ): Promise<NotificationPage> {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });
    if (typeof isRead === "boolean") {
      params.set("isRead", String(isRead));
    }
    return apiClient<NotificationPage>(`/api/notifications?${params.toString()}`, {
      signal,
    });
  },

  getUnreadCount(signal?: AbortSignal): Promise<UnreadCountResponse> {
    return apiClient<UnreadCountResponse>("/api/notifications/unread-count", {
      signal,
    });
  },

  markAsRead(id: number): Promise<NotificationDto> {
    return apiClient<NotificationDto>(`/api/notifications/${id}/read`, {
      method: "PUT",
    });
  },

  markAllAsRead(): Promise<MarkAllReadResponse> {
    return apiClient<MarkAllReadResponse>("/api/notifications/read-all", {
      method: "PUT",
    });
  },
};
