package com.servis.backend.ratelimit;

/**
 * Basit rate limit abstraction — in-memory varsayılan; multi-instance için yetersiz olabilir.
 */
public interface RateLimitStore {

    /**
     * @return true izin verildi; false limit aşıldı
     */
    boolean tryConsume(String key, int limit, long windowMs);
}
