package com.servis.backend.dto;

public class BotTechnicianLookupDto {

    private Long id;
    private String fullName;
    private String whatsappNumber;
    private Boolean isAvailable;

    public BotTechnicianLookupDto() {
    }

    public BotTechnicianLookupDto(Long id, String fullName, String whatsappNumber, Boolean isAvailable) {
        this.id = id;
        this.fullName = fullName;
        this.whatsappNumber = whatsappNumber;
        this.isAvailable = isAvailable;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getWhatsappNumber() {
        return whatsappNumber;
    }

    public void setWhatsappNumber(String whatsappNumber) {
        this.whatsappNumber = whatsappNumber;
    }

    public Boolean getIsAvailable() {
        return isAvailable;
    }

    public void setIsAvailable(Boolean available) {
        isAvailable = available;
    }
}
