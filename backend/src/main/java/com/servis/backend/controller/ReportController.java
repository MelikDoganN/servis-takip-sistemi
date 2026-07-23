package com.servis.backend.controller;

import com.servis.backend.entity.WorkOrder;
import com.servis.backend.repository.WorkOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @GetMapping("/workorder-summary")
    public Map<String, Object> getWorkOrderSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        List<WorkOrder> workOrders;
        if (startDate != null && endDate != null) {
            workOrders = workOrderRepository.findByCreatedAtBetween(startDate.atStartOfDay(), endDate.atStartOfDay().plusDays(1));
        } else {
            workOrders = workOrderRepository.findAll();
        }

        long total = workOrders.size();
        long open = workOrders.stream().filter(w -> "OPEN".equals(w.getStatus())).count();
        long assigned = workOrders.stream().filter(w -> "ASSIGNED".equals(w.getStatus())).count();
        long waitingParts = workOrders.stream().filter(w -> "WAITING_PARTS".equals(w.getStatus())).count();
        long resolved = workOrders.stream().filter(w -> "RESOLVED".equals(w.getStatus())).count();
        long closed = workOrders.stream().filter(w -> "CLOSED".equals(w.getStatus())).count();

        Map<String, Object> result = new HashMap<>();
        result.put("total", total);
        result.put("open", open);
        result.put("assigned", assigned);
        result.put("waitingParts", waitingParts);
        result.put("resolved", resolved);
        result.put("closed", closed);
        return result;
    }
}