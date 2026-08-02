"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAuthenticated } from "@/lib/auth";
import { notificationService } from "@/services/notificationService";

const POLL_MS = 45_000;

/**
 * Unread count — uygulama açılışında + görünür sekmede 45 sn polling.
 * Logout / unmount sonrası state güncellemesi yapmaz.
 */
export function useUnreadNotificationCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!isAuthenticated()) {
      if (mountedRef.current) {
        setCount(0);
        setLoading(false);
      }
      return;
    }
    try {
      const res = await notificationService.getUnreadCount(signal);
      if (mountedRef.current && !signal?.aborted) {
        setCount(typeof res.count === "number" ? res.count : 0);
      }
    } catch {
      // Sessiz: badge bozulmasın
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();
    void refresh(controller.signal);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, POLL_MS);

    return () => {
      mountedRef.current = false;
      controller.abort();
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const decrement = useCallback(() => {
    setCount((c) => Math.max(0, c - 1));
  }, []);

  const resetToZero = useCallback(() => {
    setCount(0);
  }, []);

  const setFromServer = useCallback((value: number) => {
    setCount(Math.max(0, value));
  }, []);

  return { count, loading, refresh, decrement, resetToZero, setFromServer };
}
