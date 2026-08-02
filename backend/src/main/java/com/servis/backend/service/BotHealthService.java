package com.servis.backend.service;

import com.servis.backend.dto.BotHealthDto;
import com.servis.backend.entity.WhatsAppOutbox;
import com.servis.backend.repository.WhatsAppOutboxRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class BotHealthService {

    @Autowired
    private WhatsAppNotificationClient whatsAppNotificationClient;

    @Autowired
    private WhatsAppOutboxService whatsAppOutboxService;

    @Autowired
    private WhatsAppOutboxRepository whatsAppOutboxRepository;

    public BotHealthDto getHealth() {
        BotHealthDto dto = new BotHealthDto();
        boolean configured = whatsAppNotificationClient.isBotUrlConfigured();
        dto.setBotUrlConfigured(configured);
        boolean reachable = false;
        if (configured) {
            reachable = whatsAppNotificationClient.pingBotHealth();
        }
        dto.setBotReachable(reachable);
        if (!configured) {
            dto.setBotStatus("NOT_CONFIGURED");
        } else if (reachable) {
            dto.setBotStatus("UP");
        } else {
            dto.setBotStatus("DOWN");
        }
        dto.setLastSuccessfulSendAt(whatsAppOutboxService.lastSentAt());
        dto.setLastFailedSendAt(
                whatsAppOutboxRepository.findFirstByStatusInOrderByCreatedAtDesc(
                                java.util.List.of(WhatsAppOutbox.STATUS_FAILED))
                        .map(o -> o.getCreatedAt())
                        .orElse(null)
        );
        // Also consider last failed outbound interaction time via outbox failed count
        dto.setPendingOutboxCount(whatsAppOutboxService.countPending());
        dto.setFailedOutboxCount(whatsAppOutboxService.countFailed());
        return dto;
    }
}
