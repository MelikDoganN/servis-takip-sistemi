package com.servis.backend.repository;

import com.servis.backend.entity.Technician;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TechnicianRepository extends JpaRepository<Technician, Long> {

    // İş yükü belirli bir değerden az olan ve müsait olan teknisyenleri listele
    List<Technician> findByIsAvailableTrueAndCurrentWorkloadLessThan(Integer maxWorkload);

    // Bir kullanıcıya ait teknisyen bul
    Optional<Technician> findByUserId(Long userId);

    // Bölgeye göre müsait teknisyenler
    List<Technician> findByRegionIdAndIsAvailableTrue(Long regionId);
}