package com.servis.backend.repository;

import com.servis.backend.entity.NotificationDedup;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationDedupRepository extends JpaRepository<NotificationDedup, Long> {

    boolean existsByWorkOrderIdAndEventTypeAndEventKey(Long workOrderId, String eventType, String eventKey);
}
