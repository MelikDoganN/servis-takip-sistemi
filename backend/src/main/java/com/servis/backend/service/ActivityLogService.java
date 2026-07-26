package com.servis.backend.service;

import com.servis.backend.entity.ActivityLog;
import com.servis.backend.entity.User;
import com.servis.backend.repository.ActivityLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ActivityLogService {

    @Autowired
    private ActivityLogRepository activityLogRepository;

    public void log(String action, String entityName, Long entityId, User user, String channel, String ipAddress) {
        ActivityLog log = new ActivityLog();
        if (user != null) {
            log.setUserId(user.getId());
        }
        log.setAction(action);
        log.setEntityName(entityName);
        log.setEntityId(entityId);
        log.setChannel(channel);
        log.setIpAddress(ipAddress);
        activityLogRepository.save(log);
    }

    public void logWithTechnician(String action, String entityName, Long entityId, Long technicianId, String channel, String ipAddress) {
        ActivityLog log = new ActivityLog();
        log.setTechnicianId(technicianId);
        log.setAction(action);
        log.setEntityName(entityName);
        log.setEntityId(entityId);
        log.setChannel(channel);
        log.setIpAddress(ipAddress);
        activityLogRepository.save(log);
    }
}