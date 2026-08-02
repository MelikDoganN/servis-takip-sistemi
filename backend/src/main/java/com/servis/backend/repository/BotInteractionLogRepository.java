package com.servis.backend.repository;

import com.servis.backend.entity.BotInteractionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface BotInteractionLogRepository extends JpaRepository<BotInteractionLog, Long> {

    boolean existsByExternalMessageId(String externalMessageId);

    Optional<BotInteractionLog> findByExternalMessageId(String externalMessageId);

    @Query("SELECT b FROM BotInteractionLog b WHERE "
            + "(:direction IS NULL OR b.direction = :direction) AND "
            + "(:status IS NULL OR b.status = :status) AND "
            + "(:eventType IS NULL OR b.eventType = :eventType)")
    Page<BotInteractionLog> search(
            @Param("direction") String direction,
            @Param("status") String status,
            @Param("eventType") String eventType,
            Pageable pageable);
}
