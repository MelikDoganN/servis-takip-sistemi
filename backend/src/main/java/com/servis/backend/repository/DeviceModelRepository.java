package com.servis.backend.repository;

import com.servis.backend.entity.DeviceModel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DeviceModelRepository extends JpaRepository<DeviceModel, Long> {
    List<DeviceModel> findByBrandId(Long brandId);
}