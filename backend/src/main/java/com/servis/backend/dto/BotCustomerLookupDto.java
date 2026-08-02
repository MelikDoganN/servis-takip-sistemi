package com.servis.backend.dto;

public class BotCustomerLookupDto {

    private Long id;
    private String fullName;
    private String whatsappNumber;
    private String phone;

    public BotCustomerLookupDto() {
    }

    public BotCustomerLookupDto(Long id, String fullName, String whatsappNumber, String phone) {
        this.id = id;
        this.fullName = fullName;
        this.whatsappNumber = whatsappNumber;
        this.phone = phone;
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

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }
}
