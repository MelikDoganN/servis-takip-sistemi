package com.servis.backend.repository;

import com.servis.backend.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DeviceRepository extends JpaRepository<Device, Long> {
    // Seri numarası benzersiz olduğu için onunla sorgulama
    Optional<Device> findBySerialNumber(String serialNumber);
}