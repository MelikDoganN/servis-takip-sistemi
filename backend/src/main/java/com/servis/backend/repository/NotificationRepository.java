package com.servis.backend.repository;

import com.servis.backend.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByRecipientUserIdOrderByCreatedAtDesc(Long recipientUserId, Pageable pageable);

    Page<Notification> findByRecipientUserIdAndIsReadOrderByCreatedAtDesc(
            Long recipientUserId, boolean isRead, Pageable pageable);

    long countByRecipientUserIdAndIsReadFalse(Long recipientUserId);

    boolean existsByRecipientUserIdAndTypeAndRelatedEntityIdAndChannelAndEventKey(
            Long recipientUserId, String type, Long relatedEntityId, String channel, String eventKey);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt "
            + "WHERE n.recipientUserId = :userId AND n.isRead = false")
    int markAllRead(@Param("userId") Long userId, @Param("readAt") LocalDateTime readAt);
}
