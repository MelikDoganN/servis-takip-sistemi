package com.servis.backend.dto;

import java.time.LocalDateTime;

public class BotHealthDto {

    private boolean botUrlConfigured;
    private boolean botReachable;
    private String botStatus;
    private LocalDateTime lastSuccessfulSendAt;
    private LocalDateTime lastFailedSendAt;
    private long pendingOutboxCount;
    private long failedOutboxCount;

    public boolean isBotUrlConfigured() {
        return botUrlConfigured;
    }

    public void setBotUrlConfigured(boolean botUrlConfigured) {
        this.botUrlConfigured = botUrlConfigured;
    }

    public boolean isBotReachable() {
        return botReachable;
    }

    public void setBotReachable(boolean botReachable) {
        this.botReachable = botReachable;
    }

    public String getBotStatus() {
        return botStatus;
    }

    public void setBotStatus(String botStatus) {
        this.botStatus = botStatus;
    }

    public LocalDateTime getLastSuccessfulSendAt() {
        return lastSuccessfulSendAt;
    }

    public void setLastSuccessfulSendAt(LocalDateTime lastSuccessfulSendAt) {
        this.lastSuccessfulSendAt = lastSuccessfulSendAt;
    }

    public LocalDateTime getLastFailedSendAt() {
        return lastFailedSendAt;
    }

    public void setLastFailedSendAt(LocalDateTime lastFailedSendAt) {
        this.lastFailedSendAt = lastFailedSendAt;
    }

    public long getPendingOutboxCount() {
        return pendingOutboxCount;
    }

    public void setPendingOutboxCount(long pendingOutboxCount) {
        this.pendingOutboxCount = pendingOutboxCount;
    }

    public long getFailedOutboxCount() {
        return failedOutboxCount;
    }

    public void setFailedOutboxCount(long failedOutboxCount) {
        this.failedOutboxCount = failedOutboxCount;
    }
}
