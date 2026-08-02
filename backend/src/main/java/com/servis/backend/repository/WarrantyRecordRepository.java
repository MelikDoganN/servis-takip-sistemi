package com.servis.backend.repository;

import com.servis.backend.entity.WarrantyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WarrantyRecordRepository extends JpaRepository<WarrantyRecord, Long> {
    // Bir cihaza ait tüm garanti kayıtlarını bul
    List<WarrantyRecord> findByDeviceId(Long deviceId);
    
    // Bir cihaza ait belirli tipteki (PARTS, LABOR, GENERAL) garantiyi bul
    Optional<WarrantyRecord> findByDeviceIdAndWarrantyType(Long deviceId, String warrantyType);
}