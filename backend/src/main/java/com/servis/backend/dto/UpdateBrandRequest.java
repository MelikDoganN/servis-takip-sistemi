package com.servis.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class UpdateBrandRequest {

    @NotBlank(message = "Marka adı zorunludur")
    private String name;

    private String description;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
