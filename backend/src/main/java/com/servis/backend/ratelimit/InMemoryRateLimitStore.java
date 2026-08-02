package com.servis.backend.ratelimit;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class InMemoryRateLimitStore implements RateLimitStore {

    private final Map<String, Deque<Long>> windows = new ConcurrentHashMap<>();

    @Override
    public boolean tryConsume(String key, int limit, long windowMs) {
        long now = System.currentTimeMillis();
        Deque<Long> q = windows.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (q) {
            while (!q.isEmpty() && now - q.peekFirst() > windowMs) {
                q.pollFirst();
            }
            if (q.size() >= limit) {
                return false;
            }
            q.addLast(now);
            return true;
        }
    }
}
