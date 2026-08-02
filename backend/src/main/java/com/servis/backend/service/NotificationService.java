package com.servis.backend.service;

import com.servis.backend.dto.NotificationDto;
import com.servis.backend.entity.Notification;
import com.servis.backend.entity.User;
import com.servis.backend.entity.WorkOrder;
import com.servis.backend.repository.NotificationRepository;
import com.servis.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class NotificationService {

    public static final String CHANNEL_IN_APP = "IN_APP";
    public static final String CHANNEL_WHATSAPP = "WHATSAPP";

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_SENT = "SENT";
    public static final String STATUS_FAILED = "FAILED";
    public static final String STATUS_SKIPPED = "SKIPPED";

    public static final String TYPE_WORK_ORDER_CREATED = "WORK_ORDER_CREATED";
    public static final String TYPE_TECHNICIAN_ASSIGNED = "TECHNICIAN_ASSIGNED";
    public static final String TYPE_STATUS_CHANGED = "STATUS_CHANGED";
    public static final String TYPE_WARRANTY_WARNING = "WARRANTY_WARNING";
    public static final String TYPE_SYSTEM = "SYSTEM";

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private static final List<String> OPS_ROLES = List.of("ADMIN", "CENTER_OPERATOR", "REGION_MANAGER");

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<NotificationDto> listForUser(Long userId, Boolean isRead, Pageable pageable) {
        Page<Notification> page;
        if (isRead == null) {
            page = notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(userId, pageable);
        } else {
            page = notificationRepository.findByRecipientUserIdAndIsReadOrderByCreatedAtDesc(
                    userId, isRead, pageable);
        }
        return page.map(this::toDto);
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return notificationRepository.countByRecipientUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public NotificationDto markRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bildirim bulunamadı"));
        if (notification.getRecipientUserId() == null || !notification.getRecipientUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bildirim bulunamadı");
        }
        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);
        }
        return toDto(notification);
    }

    @Transactional
    public int markAllRead(Long userId) {
        return notificationRepository.markAllRead(userId, LocalDateTime.now());
    }

    /**
     * IN_APP bildirim üretimi — hata ana akışı bozmaz.
     */
    public void createInAppSafely(Long recipientUserId, String type, String title, String message,
                                  String relatedEntityType, Long relatedEntityId, String eventKey) {
        try {
            if (recipientUserId == null) {
                return;
            }
            String key = eventKey != null && !eventKey.isBlank() ? eventKey : "default";
            if (notificationRepository.existsByRecipientUserIdAndTypeAndRelatedEntityIdAndChannelAndEventKey(
                    recipientUserId, type, relatedEntityId, CHANNEL_IN_APP, key)) {
                return;
            }
            Notification n = new Notification();
            n.setRecipientUserId(recipientUserId);
            n.setType(type);
            n.setTitle(truncate(title, 200));
            n.setMessage(truncate(message, 1000));
            n.setRelatedEntityType(relatedEntityType);
            n.setRelatedEntityId(relatedEntityId);
            n.setChannel(CHANNEL_IN_APP);
            n.setStatus(STATUS_SENT);
            n.setRead(false);
            n.setEventKey(key);
            notificationRepository.saveAndFlush(n);
        } catch (DataIntegrityViolationException e) {
            log.info("Duplicate IN_APP bildirim atlandı: user={} type={} wo={}",
                    recipientUserId, type, relatedEntityId);
        } catch (Exception e) {
            log.warn("IN_APP bildirim yazılamadı: {}", e.getClass().getSimpleName());
        }
    }

    public void notifyWorkOrderCreated(WorkOrder workOrder) {
        try {
            Long woId = workOrder.getId();
            String serviceNo = workOrder.getServiceNumber() != null
                    ? workOrder.getServiceNumber()
                    : String.valueOf(woId);
            for (Long userId : resolveRecipients(workOrder, true)) {
                createInAppSafely(
                        userId,
                        TYPE_WORK_ORDER_CREATED,
                        "Yeni iş emri",
                        "Yeni servis kaydı oluşturuldu. Servis No: " + serviceNo + ".",
                        "WORK_ORDER",
                        woId,
                        "created"
                );
            }
        } catch (Exception e) {
            log.warn("IN_APP create bildirimleri başarısız: {}", e.getClass().getSimpleName());
        }
    }

    public void notifyTechnicianAssigned(WorkOrder workOrder, String technicianName) {
        try {
            Long woId = workOrder.getId();
            String serviceNo = workOrder.getServiceNumber() != null
                    ? workOrder.getServiceNumber()
                    : String.valueOf(woId);
            String name = technicianName != null && !technicianName.isBlank() ? technicianName : "teknisyen";
            String eventKey = "tech:" + (workOrder.getTechnician() != null ? workOrder.getTechnician().getId() : "x");
            for (Long userId : resolveRecipients(workOrder, true)) {
                createInAppSafely(
                        userId,
                        TYPE_TECHNICIAN_ASSIGNED,
                        "Teknisyen atandı",
                        serviceNo + " numaralı servis kaydına teknisyen atandı: " + name + ".",
                        "WORK_ORDER",
                        woId,
                        eventKey
                );
            }
        } catch (Exception e) {
            log.warn("IN_APP assign bildirimleri başarısız: {}", e.getClass().getSimpleName());
        }
    }

    public void notifyStatusChanged(WorkOrder workOrder, String newStatus) {
        try {
            Long woId = workOrder.getId();
            String serviceNo = workOrder.getServiceNumber() != null
                    ? workOrder.getServiceNumber()
                    : String.valueOf(woId);
            String title = statusTitle(newStatus);
            String message = statusMessage(serviceNo, newStatus);
            if (message == null) {
                return;
            }
            for (Long userId : resolveRecipients(workOrder, true)) {
                createInAppSafely(
                        userId,
                        TYPE_STATUS_CHANGED,
                        title,
                        message,
                        "WORK_ORDER",
                        woId,
                        newStatus
                );
            }
        } catch (Exception e) {
            log.warn("IN_APP status bildirimleri başarısız: {}", e.getClass().getSimpleName());
        }
    }

    private Set<Long> resolveRecipients(WorkOrder workOrder, boolean includeOps) {
        Set<Long> ids = new HashSet<>();
        if (workOrder.getCreatedBy() != null && workOrder.getCreatedBy().getId() != null) {
            ids.add(workOrder.getCreatedBy().getId());
        }
        if (workOrder.getTechnician() != null
                && workOrder.getTechnician().getUser() != null
                && workOrder.getTechnician().getUser().getId() != null) {
            ids.add(workOrder.getTechnician().getUser().getId());
        }
        if (includeOps) {
            for (User u : userRepository.findActiveByRoleNames(OPS_ROLES)) {
                if (u.getId() != null) {
                    ids.add(u.getId());
                }
            }
        }
        return ids;
    }

    private static String statusTitle(String status) {
        return switch (status == null ? "" : status) {
            case "RESOLVED" -> "İş emri çözüldü";
            case "CLOSED" -> "İş emri kapatıldı";
            case "CANCELLED" -> "İş emri iptal edildi";
            case "IN_PROGRESS" -> "İş emri ilerliyor";
            case "WAITING_PARTS" -> "Parça bekleniyor";
            case "ASSIGNED" -> "İş emri atandı";
            case "OPEN" -> "İş emri açıldı";
            default -> "İş emri durumu güncellendi";
        };
    }

    private static String statusMessage(String serviceNo, String status) {
        if (status == null) {
            return null;
        }
        String sn = serviceNo != null ? serviceNo : "?";
        return switch (status) {
            case "OPEN" -> sn + " numaralı servis kaydı açıldı.";
            case "ASSIGNED" -> sn + " numaralı servis kaydına teknisyen atandı.";
            case "IN_PROGRESS" -> sn + " numaralı servis kaydı İşlemde olarak güncellendi.";
            case "WAITING_PARTS" -> sn + " numaralı servis kaydı için parça bekleniyor.";
            case "RESOLVED" -> sn + " numaralı servis kaydı çözüldü.";
            case "CLOSED" -> sn + " numaralı servis kaydı kapatıldı.";
            case "CANCELLED" -> sn + " numaralı servis kaydı iptal edildi.";
            default -> sn + " numaralı servis kaydının durumu güncellendi: " + status + ".";
        };
    }

    private NotificationDto toDto(Notification n) {
        NotificationDto dto = new NotificationDto();
        dto.setId(n.getId());
        dto.setType(n.getType());
        dto.setTitle(n.getTitle());
        dto.setMessage(n.getMessage());
        dto.setRelatedEntityType(n.getRelatedEntityType());
        dto.setRelatedEntityId(n.getRelatedEntityId());
        dto.setChannel(n.getChannel());
        dto.setStatus(n.getStatus());
        dto.setRead(n.isRead());
        dto.setCreatedAt(n.getCreatedAt());
        dto.setReadAt(n.getReadAt());
        return dto;
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return "";
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
