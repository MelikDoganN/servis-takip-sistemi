package com.servis.backend.controller;

import com.servis.backend.repository.CustomerRepository;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.WorkOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
    public ResponseEntity<Map<String, Long>> getKpi() {
        Map<String, Long> kpi = new HashMap<>();
        
        long totalWorkOrders = workOrderRepository.count();
        long openWorkOrders = workOrderRepository.findByStatus("OPEN").size();
        long resolvedWorkOrders = workOrderRepository.findByStatus("RESOLVED").size();
        long closedWorkOrders = workOrderRepository.findByStatus("CLOSED").size();
        long totalCustomers = customerRepository.count();
        long totalDevices = deviceRepository.count();

        kpi.put("totalWorkOrders", totalWorkOrders);
        kpi.put("openWorkOrders", openWorkOrders);
        kpi.put("resolvedWorkOrders", resolvedWorkOrders);
        kpi.put("closedWorkOrders", closedWorkOrders);
        kpi.put("totalCustomers", totalCustomers);
        kpi.put("totalDevices", totalDevices);

        return ResponseEntity.ok(kpi);
    }
}