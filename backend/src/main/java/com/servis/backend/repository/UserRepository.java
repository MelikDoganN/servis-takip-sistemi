package com.servis.backend.repository;

import com.servis.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Page<User> findByFullNameContainingIgnoreCase(String fullName, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.role.name IN :roleNames AND u.isActive = true")
    List<User> findActiveByRoleNames(@Param("roleNames") Collection<String> roleNames);
}