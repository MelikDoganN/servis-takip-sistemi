package com.servis.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.servis.backend.dto.WhatsAppNotificationRequest;
import com.servis.backend.entity.WhatsAppOutbox;
import com.servis.backend.repository.WhatsAppOutboxRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WhatsAppOutboxServiceTest {

    @Mock
    private WhatsAppOutboxRepository whatsAppOutboxRepository;

    @InjectMocks
    private WhatsAppOutboxService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "objectMapper", new ObjectMapper());
    }

    @Test
    void enqueueIfAbsent_Duplicate_ReturnsFalse() {
        when(whatsAppOutboxRepository.existsByWorkOrderIdAndEventTypeAndEventKey(1L, "STATUS_CHANGED", "CLOSED"))
                .thenReturn(true);
        WhatsAppNotificationRequest req = new WhatsAppNotificationRequest();
        req.setWorkOrderId(1L);
        req.setEventType("STATUS_CHANGED");
        req.setTargetStatus("CLOSED");
        req.setMessage("x");
        assertFalse(service.enqueueIfAbsent(req, "905551112233", "ERR"));
        verify(whatsAppOutboxRepository, never()).saveAndFlush(any());
    }

    @Test
    void enqueueIfAbsent_New_SavesPending() {
        when(whatsAppOutboxRepository.existsByWorkOrderIdAndEventTypeAndEventKey(1L, "STATUS_CHANGED", "CLOSED"))
                .thenReturn(false);
        when(whatsAppOutboxRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        WhatsAppNotificationRequest req = new WhatsAppNotificationRequest();
        req.setWorkOrderId(1L);
        req.setEventType("STATUS_CHANGED");
        req.setTargetStatus("CLOSED");
        req.setMessage("Kapandı");

        assertTrue(service.enqueueIfAbsent(req, "905551112233", "Timeout"));
        verify(whatsAppOutboxRepository).saveAndFlush(any(WhatsAppOutbox.class));
    }

    @Test
    void markRetryOrFailed_ThirdAttempt_Fails() {
        WhatsAppOutbox row = new WhatsAppOutbox();
        row.setAttemptCount(2);
        row.setStatus(WhatsAppOutbox.STATUS_PROCESSING);
        service.markRetryOrFailed(row, "ERR");
        assertEquals(WhatsAppOutbox.STATUS_FAILED, row.getStatus());
        assertEquals(3, row.getAttemptCount());
        verify(whatsAppOutboxRepository).save(row);
    }

    @Test
    void markRetryOrFailed_SecondAttempt_StaysPending() {
        WhatsAppOutbox row = new WhatsAppOutbox();
        row.setAttemptCount(1);
        row.setStatus(WhatsAppOutbox.STATUS_PROCESSING);
        service.markRetryOrFailed(row, "ERR");
        assertEquals(WhatsAppOutbox.STATUS_PENDING, row.getStatus());
        assertEquals(2, row.getAttemptCount());
        assertTrue(row.getNextAttemptAt().isAfter(LocalDateTime.now()));
    }

    @Test
    void claimDueBatch_OptimisticClaim() {
        WhatsAppOutbox due = new WhatsAppOutbox();
        due.setId(5L);
        due.setStatus(WhatsAppOutbox.STATUS_PENDING);
        when(whatsAppOutboxRepository.findDuePending(any())).thenReturn(List.of(due));
        when(whatsAppOutboxRepository.claim(eq(5L), any(), any())).thenReturn(1);

        List<WhatsAppOutbox> claimed = service.claimDueBatch(10);
        assertEquals(1, claimed.size());
        assertEquals(WhatsAppOutbox.STATUS_PROCESSING, claimed.get(0).getStatus());
    }

    @Test
    void claimDueBatch_AlreadyClaimedByOther_Skipped() {
        WhatsAppOutbox due = new WhatsAppOutbox();
        due.setId(6L);
        when(whatsAppOutboxRepository.findDuePending(any())).thenReturn(List.of(due));
        when(whatsAppOutboxRepository.claim(eq(6L), any(), any())).thenReturn(0);

        assertTrue(service.claimDueBatch(10).isEmpty());
    }
}
