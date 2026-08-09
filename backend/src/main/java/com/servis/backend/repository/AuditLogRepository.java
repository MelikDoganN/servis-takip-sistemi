package com.servis.backend.repository;

import com.servis.backend.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("""
            SELECT a FROM AuditLog a
            WHERE (:action IS NULL OR a.action = :action)
              AND (:entityType IS NULL OR a.entityType = :entityType)
              AND (:actorUserId IS NULL OR a.actorUserId = :actorUserId)
              AND (:source IS NULL OR a.source = :source)
              AND (:success IS NULL OR a.success = :success)
              AND (:dateFrom IS NULL OR a.createdAt >= :dateFrom)
              AND (:dateTo IS NULL OR a.createdAt <= :dateTo)
              AND (
                    :search IS NULL OR :search = ''
                    OR LOWER(COALESCE(a.actorName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(a.actorEmail, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(a.description, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(a.entityDisplay, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                  )
            """)
    Page<AuditLog> search(
            @Param("action") String action,
            @Param("entityType") String entityType,
            @Param("actorUserId") Long actorUserId,
            @Param("source") String source,
            @Param("success") Boolean success,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo,
            @Param("search") String search,
            Pageable pageable);
}
