package com.servis.backend.repository;

import com.servis.backend.entity.BotInteractionLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BotInteractionLogRepository extends JpaRepository<BotInteractionLog, Long> {

    boolean existsByExternalMessageId(String externalMessageId);

    Optional<BotInteractionLog> findByExternalMessageId(String externalMessageId);
}
