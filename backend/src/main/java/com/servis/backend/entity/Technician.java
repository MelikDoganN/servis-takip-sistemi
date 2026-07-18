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
@Table(name = "technicians")
public class Technician {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // Teknisyenin kullanıcı hesabı

    @ManyToOne
    @JoinColumn(name = "region_id")
    private Region region; // Teknisyenin çalıştığı bölge

    @Column(name = "whatsapp_number", length = 20)
    private String whatsappNumber;

    @Column(name = "current_workload")
    private Integer currentWorkload = 0; // Mevcut iş yükü (atandığı açık iş emirleri)

    @Column(name = "is_available")
    private Boolean isAvailable = true; // Müsaitlik durumu

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}