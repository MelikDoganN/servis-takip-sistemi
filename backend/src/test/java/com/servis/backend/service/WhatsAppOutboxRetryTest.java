package com.servis.backend.service;

import com.servis.backend.entity.WhatsAppOutbox;
import com.servis.backend.repository.WhatsAppOutboxRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WhatsAppOutboxRetryTest {

    @Mock
    private WhatsAppOutboxRepository whatsAppOutboxRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private WhatsAppOutboxService whatsAppOutboxService;

    private WhatsAppOutbox failed;

    @BeforeEach
    void setUp() {
        failed = new WhatsAppOutbox();
        failed.setId(7L);
        failed.setWorkOrderId(42L);
        failed.setStatus(WhatsAppOutbox.STATUS_FAILED);
        failed.setAttemptCount(3);
        failed.setEventType("STATUS_CHANGED");
        failed.setEventKey("RESOLVED");
        failed.setRecipientPhone("905551112233");
        failed.setPayload("{\"message\":\"x\"}");
    }

    @Test
    void requeueForRetry_ResetsFailedToPending() {
        when(whatsAppOutboxRepository.findById(7L)).thenReturn(Optional.of(failed));
        when(whatsAppOutboxRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WhatsAppOutbox result = whatsAppOutboxService.requeueForRetry(7L);
        assertEquals(WhatsAppOutbox.STATUS_PENDING, result.getStatus());
        assertNotNull(result.getNextAttemptAt());
        assertTrue(result.getAttemptCount() < WhatsAppOutboxService.MAX_ATTEMPTS);
    }

    @Test
    void requeueFailedForWorkOrder_RequeuesAllFailed() {
        when(whatsAppOutboxRepository.findByWorkOrderIdAndStatus(42L, WhatsAppOutbox.STATUS_FAILED))
                .thenReturn(List.of(failed));
        when(whatsAppOutboxRepository.findById(7L)).thenReturn(Optional.of(failed));
        when(whatsAppOutboxRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        List<WhatsAppOutbox> list = whatsAppOutboxService.requeueFailedForWorkOrder(42L);
        assertEquals(1, list.size());
        assertEquals(WhatsAppOutbox.STATUS_PENDING, list.get(0).getStatus());
    }

    @Test
    void requeueSent_Throws() {
        failed.setStatus(WhatsAppOutbox.STATUS_SENT);
        when(whatsAppOutboxRepository.findById(7L)).thenReturn(Optional.of(failed));
        assertThrows(IllegalStateException.class, () -> whatsAppOutboxService.requeueForRetry(7L));
    }
}
