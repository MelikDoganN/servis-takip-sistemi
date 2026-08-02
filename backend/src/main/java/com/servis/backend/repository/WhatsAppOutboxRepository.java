package com.servis.backend.repository;

import com.servis.backend.entity.WhatsAppOutbox;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface WhatsAppOutboxRepository extends JpaRepository<WhatsAppOutbox, Long> {

    boolean existsByWorkOrderIdAndEventTypeAndEventKey(Long workOrderId, String eventType, String eventKey);

    long countByStatus(String status);

    Optional<WhatsAppOutbox> findFirstByStatusOrderBySentAtDesc(String status);

    Optional<WhatsAppOutbox> findFirstByStatusInOrderByCreatedAtDesc(List<String> statuses);

    List<WhatsAppOutbox> findByWorkOrderIdAndStatus(Long workOrderId, String status);

    List<WhatsAppOutbox> findByWorkOrderIdOrderByCreatedAtDesc(Long workOrderId);

    @Query("SELECT o FROM WhatsAppOutbox o WHERE o.status = 'PENDING' "
            + "AND (o.nextAttemptAt IS NULL OR o.nextAttemptAt <= :now) "
            + "ORDER BY o.createdAt ASC")
    List<WhatsAppOutbox> findDuePending(@Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE WhatsAppOutbox o SET o.status = 'PROCESSING', o.claimedAt = :now, o.claimToken = :token "
            + "WHERE o.id = :id AND o.status = 'PENDING'")
    int claim(@Param("id") Long id, @Param("now") LocalDateTime now, @Param("token") String token);
}
