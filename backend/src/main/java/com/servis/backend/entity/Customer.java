package com.servis.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "customers")
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Ad soyad boş olamaz")
    @Size(max = 150, message = "Ad soyad en fazla 150 karakter olabilir")
    @Column(name = "full_name", length = 150, nullable = false)
    private String fullName;

    @Size(max = 20, message = "Telefon numarası en fazla 20 karakter olabilir")
    @Column(length = 20)
    private String phone;

    @Size(max = 20, message = "WhatsApp numarası en fazla 20 karakter olabilir")
    @Column(name = "whatsapp_number", length = 20)
    private String whatsappNumber;

    @Email(message = "Geçerli bir email adresi girin")
    @Size(max = 150, message = "Email en fazla 150 karakter olabilir")
    @Column(length = 150)
    private String email;

    @Column(columnDefinition = "TEXT")
    private String address;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}