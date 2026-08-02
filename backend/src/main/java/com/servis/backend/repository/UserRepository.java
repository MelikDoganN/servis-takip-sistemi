package com.servis.backend.repository;

import com.servis.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // Kullanıcıyı email ile bul 
    Optional<User> findByEmail(String email);
}