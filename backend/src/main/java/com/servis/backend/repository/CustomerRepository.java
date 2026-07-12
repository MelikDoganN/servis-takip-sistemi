package com.servis.backend.repository;

import com.servis.backend.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    // Telefon veya email ile müşteri bulmak için 
    Optional<Customer> findByPhone(String phone);
    Optional<Customer> findByEmail(String email);
}