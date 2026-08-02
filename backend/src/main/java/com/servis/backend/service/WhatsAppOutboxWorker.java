package com.servis.backend.service;

import com.servis.backend.entity.WhatsAppOutbox;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class WhatsAppOutboxWorker {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppOutboxWorker.class);

    private static final int BATCH_SIZE = 20;

    @Autowired
    private WhatsAppOutboxService whatsAppOutboxService;

    @Autowired
    private WhatsAppNotificationClient whatsAppNotificationClient;

    @Scheduled(fixedDelayString = "${whatsapp.outbox.poll-ms:60000}")
    public void processDue() {
        try {
            List<WhatsAppOutbox> claimed = whatsAppOutboxService.claimDueBatch(BATCH_SIZE);
            if (claimed.isEmpty()) {
                return;
            }
            log.info("WhatsApp outbox: {} kayıt işlenecek", claimed.size());
            for (WhatsAppOutbox row : claimed) {
                processOne(row);
            }
        } catch (Exception e) {
            log.warn("WhatsApp outbox worker hatası: {}", e.getClass().getSimpleName());
        }
    }

    private void processOne(WhatsAppOutbox row) {
        try {
            boolean ok = whatsAppNotificationClient.retrySend(row);
            if (ok) {
                whatsAppOutboxService.markSent(row);
            } else {
                whatsAppOutboxService.markRetryOrFailed(row, "RETRY_FAILED");
            }
        } catch (Exception e) {
            whatsAppOutboxService.markRetryOrFailed(row, e.getClass().getSimpleName());
        }
    }
}
