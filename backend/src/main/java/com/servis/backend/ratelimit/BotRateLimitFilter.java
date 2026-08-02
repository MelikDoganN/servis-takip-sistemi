package com.servis.backend.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class BotRateLimitFilter extends OncePerRequestFilter {

    @Autowired
    private RateLimitStore rateLimitStore;

    @Value("${whatsapp.rate-limit.limit:120}")
    private int limit;

    @Value("${whatsapp.rate-limit.window-ms:60000}")
    private long windowMs;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !(path.startsWith("/api/customers/by-whatsapp/")
                || path.startsWith("/api/technicians/by-whatsapp/")
                || path.equals("/api/bot/inbound-claim"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String apiKey = request.getHeader("X-Bot-Api-Key");
        String ip = clientIp(request);
        String key = "bot:" + (apiKey != null && !apiKey.isBlank() ? ("key:" + apiKey.hashCode()) : ("ip:" + ip));
        if (!rateLimitStore.tryConsume(key, limit, windowMs)) {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"error\":\"Too many requests\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }
}
