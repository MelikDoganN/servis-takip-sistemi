package com.servis.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class UpdateDeviceModelRequest {

    @NotBlank(message = "Model adı zorunludur")
    private String name;

    @NotNull(message = "Marka zorunludur")
    private Long brandId;

    @NotBlank(message = "Cihaz türü zorunludur")
    private String deviceType;

    @NotNull(message = "Genel garanti ayı zorunludur")
    @Min(value = 0, message = "Genel garanti ayı negatif olamaz")
    private Integer generalWarrantyMonths;

    @NotNull(message = "Parça garanti ayı zorunludur")
    @Min(value = 0, message = "Parça garanti ayı negatif olamaz")
    private Integer partsWarrantyMonths;

    @NotNull(message = "İşçilik garanti ayı zorunludur")
    @Min(value = 0, message = "İşçilik garanti ayı negatif olamaz")
    private Integer laborWarrantyMonths;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getBrandId() {
        return brandId;
    }

    public void setBrandId(Long brandId) {
        this.brandId = brandId;
    }

    public String getDeviceType() {
        return deviceType;
    }

    public void setDeviceType(String deviceType) {
        this.deviceType = deviceType;
    }

    public Integer getGeneralWarrantyMonths() {
        return generalWarrantyMonths;
    }

    public void setGeneralWarrantyMonths(Integer generalWarrantyMonths) {
        this.generalWarrantyMonths = generalWarrantyMonths;
    }

    public Integer getPartsWarrantyMonths() {
        return partsWarrantyMonths;
    }

    public void setPartsWarrantyMonths(Integer partsWarrantyMonths) {
        this.partsWarrantyMonths = partsWarrantyMonths;
    }

    public Integer getLaborWarrantyMonths() {
        return laborWarrantyMonths;
    }

    public void setLaborWarrantyMonths(Integer laborWarrantyMonths) {
        this.laborWarrantyMonths = laborWarrantyMonths;
    }
}
