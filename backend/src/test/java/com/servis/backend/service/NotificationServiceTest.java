package com.servis.backend.service;

import com.servis.backend.dto.NotificationDto;
import com.servis.backend.entity.Notification;
import com.servis.backend.repository.NotificationRepository;
import com.servis.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void listForUser_ReturnsOnlyOwn() {
        Notification n = new Notification();
        n.setId(1L);
        n.setRecipientUserId(10L);
        n.setType("SYSTEM");
        n.setTitle("T");
        n.setMessage("M");
        n.setChannel("IN_APP");
        n.setStatus("SENT");
        n.setEventKey("default");
        when(notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(eq(10L), any()))
                .thenReturn(new PageImpl<>(List.of(n)));

        Page<NotificationDto> page = notificationService.listForUser(10L, null, PageRequest.of(0, 10));
        assertEquals(1, page.getTotalElements());
        assertEquals(1L, page.getContent().get(0).getId());
    }

    @Test
    void unreadCount_Delegates() {
        when(notificationRepository.countByRecipientUserIdAndIsReadFalse(5L)).thenReturn(3L);
        assertEquals(3L, notificationService.unreadCount(5L));
    }

    @Test
    void markRead_OtherUsersNotification_NotFound() {
        Notification n = new Notification();
        n.setId(2L);
        n.setRecipientUserId(99L);
        when(notificationRepository.findById(2L)).thenReturn(Optional.of(n));

        assertThrows(ResponseStatusException.class, () -> notificationService.markRead(2L, 1L));
    }

    @Test
    void createInApp_Duplicate_Skipped() {
        when(notificationRepository.existsByRecipientUserIdAndTypeAndRelatedEntityIdAndChannelAndEventKey(
                1L, "STATUS_CHANGED", 50L, "IN_APP", "CLOSED")).thenReturn(true);

        notificationService.createInAppSafely(1L, "STATUS_CHANGED", "t", "m", "WORK_ORDER", 50L, "CLOSED");
        verify(notificationRepository, never()).saveAndFlush(any());
    }

    @Test
    void markAllRead_Updates() {
        when(notificationRepository.markAllRead(eq(7L), any())).thenReturn(4);
        assertEquals(4, notificationService.markAllRead(7L));
    }
}
