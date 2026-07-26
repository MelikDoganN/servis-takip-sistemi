package com.servis.backend.repository;

import com.servis.backend.entity.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByUserId(Long userId);
    List<ActivityLog> findByAction(String action);
    List<ActivityLog> findByEntityNameAndEntityId(String entityName, Long entityId);
}