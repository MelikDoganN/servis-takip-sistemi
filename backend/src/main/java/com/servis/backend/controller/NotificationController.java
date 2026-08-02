package com.servis.backend.controller;

import com.servis.backend.dto.NotificationDto;
import com.servis.backend.entity.User;
import com.servis.backend.security.WorkOrderAccessGuard;
import com.servis.backend.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private WorkOrderAccessGuard workOrderAccessGuard;

    @GetMapping
    public Page<NotificationDto> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Boolean isRead,
            @AuthenticationPrincipal UserDetails userDetails) {
        User current = workOrderAccessGuard.requireCurrentUser(userDetails);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return notificationService.listForUser(current.getId(), isRead, pageable);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(@AuthenticationPrincipal UserDetails userDetails) {
        User current = workOrderAccessGuard.requireCurrentUser(userDetails);
        return Map.of("count", notificationService.unreadCount(current.getId()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationDto> markRead(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        User current = workOrderAccessGuard.requireCurrentUser(userDetails);
        return ResponseEntity.ok(notificationService.markRead(id, current.getId()));
    }

    @PutMapping("/read-all")
    public Map<String, Integer> markAllRead(@AuthenticationPrincipal UserDetails userDetails) {
        User current = workOrderAccessGuard.requireCurrentUser(userDetails);
        int updated = notificationService.markAllRead(current.getId());
        return Map.of("updated", updated);
    }
}
