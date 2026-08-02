package com.servis.backend.service;

import com.servis.backend.entity.BotInteractionLog;
import com.servis.backend.repository.BotInteractionLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BotInteractionLogServiceTest {

    @Mock
    private BotInteractionLogRepository botInteractionLogRepository;

    @InjectMocks
    private BotInteractionLogService service;

    @Test
    void claimInbound_FirstTime_SavesAndReturnsTrue() {
        when(botInteractionLogRepository.existsByExternalMessageId("wamid.1")).thenReturn(false);
        when(botInteractionLogRepository.saveAndFlush(any(BotInteractionLog.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        assertTrue(service.claimInboundMessage("wamid.1", "+90 555 111 22 33", "text", "!durum"));
        verify(botInteractionLogRepository).saveAndFlush(any(BotInteractionLog.class));
    }

    @Test
    void claimInbound_Duplicate_ReturnsFalse() {
        when(botInteractionLogRepository.existsByExternalMessageId("wamid.dup")).thenReturn(true);

        assertFalse(service.claimInboundMessage("wamid.dup", "905551112233", "text", "!durum"));
        verify(botInteractionLogRepository, never()).saveAndFlush(any());
    }

    @Test
    void claimInbound_ConstraintRace_ReturnsFalse() {
        when(botInteractionLogRepository.existsByExternalMessageId("wamid.race")).thenReturn(false);
        when(botInteractionLogRepository.saveAndFlush(any(BotInteractionLog.class)))
                .thenThrow(new DataIntegrityViolationException("dup"));

        assertFalse(service.claimInboundMessage("wamid.race", "905551112233", "text", "!garanti"));
    }

    @Test
    void claimInbound_BlankMessageId_AllowsProcessing() {
        assertTrue(service.claimInboundMessage("  ", "905551112233", "text", null));
        verify(botInteractionLogRepository, never()).saveAndFlush(any());
    }
}
