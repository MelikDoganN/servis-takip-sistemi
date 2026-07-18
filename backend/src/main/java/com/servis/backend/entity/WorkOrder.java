package com.servis.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "work_orders")
public class WorkOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(name = "technician_id")
    private Long technicianId; // Şimdilik Long, ileride Technician entity'si eklendiğinde ilişki kurulur

    @ManyToOne
    @JoinColumn(name = "created_by_user_id", nullable = false)
    private User createdBy;

    @Column(name = "region_id")
    private Long regionId; // Şimdilik Long

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 30)
    private String status; // OPEN, ASSIGNED, WAITING_PARTS, RESOLVED, CLOSED

    @Column(length = 20)
    private String priority; // LOW, MEDIUM, HIGH

    @Column(name = "service_type", length = 30)
    private String serviceType; // WARRANTY, PAID

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "waiting_for_parts_since")
    private LocalDateTime waitingForPartsSince;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}