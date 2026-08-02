package com.servis.backend.controller;

import com.servis.backend.repository.CustomerRepository;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.WorkOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    @GetMapping("/kpi")
    public ResponseEntity<Map<String, Object>> getKpi() {
        Map<String, Object> kpi = new HashMap<>();

        LocalDateTime dayStart = LocalDate.now().atStartOfDay();
        LocalDateTime dayEnd = LocalDate.now().atTime(LocalTime.MAX);

        long totalWorkOrders = workOrderRepository.count();
        long openWorkOrders = workOrderRepository.countByStatus("OPEN");
        long resolvedWorkOrders = workOrderRepository.countByStatus("RESOLVED");
        long closedWorkOrders = workOrderRepository.countByStatus("CLOSED");
        long totalCustomers = customerRepository.count();
        long totalDevices = deviceRepository.count();

        long openedToday = workOrderRepository.countByCreatedAtBetween(dayStart, dayEnd);
        long completedToday = workOrderRepository.countByResolvedAtBetween(dayStart, dayEnd);
        if (completedToday == 0) {
            // resolved_at henüz dolmamış eski kayıtlar için delivered/completed fallback yok;
            // resolvedAt backfill V9 ile yapıldı
        }
        long readyForDelivery = workOrderRepository.countByStatus("READY_FOR_DELIVERY");
        long waitingParts = workOrderRepository.countByStatus("WAITING_PARTS");
        long inProgress = workOrderRepository.countByStatus("IN_PROGRESS");
        Double avgHours = workOrderRepository.averageResolutionHours();

        kpi.put("totalWorkOrders", totalWorkOrders);
        kpi.put("openWorkOrders", openWorkOrders);
        kpi.put("resolvedWorkOrders", resolvedWorkOrders);
        kpi.put("closedWorkOrders", closedWorkOrders);
        kpi.put("totalCustomers", totalCustomers);
        kpi.put("totalDevices", totalDevices);

        kpi.put("openedToday", openedToday);
        kpi.put("completedToday", completedToday);
        kpi.put("readyForDelivery", readyForDelivery);
        kpi.put("waitingParts", waitingParts);
        kpi.put("inProgress", inProgress);
        kpi.put("averageResolutionHours", avgHours != null ? Math.round(avgHours * 10.0) / 10.0 : 0.0);

        return ResponseEntity.ok(kpi);
    }
}
