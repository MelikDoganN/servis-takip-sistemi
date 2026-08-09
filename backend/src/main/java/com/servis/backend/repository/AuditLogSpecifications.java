package com.servis.backend.repository;

import com.servis.backend.entity.AuditLog;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Dynamic audit filtreleri — yalnız dolu parametreler predicate olur.
 * PostgreSQL null-parameter type inference sorununu önler.
 */
public final class AuditLogSpecifications {

    private AuditLogSpecifications() {
    }

    public static Specification<AuditLog> filtering(
            String action,
            String entityType,
            Long actorUserId,
            String source,
            Boolean success,
            LocalDateTime dateFrom,
            LocalDateTime dateTo,
            String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (hasText(action)) {
                predicates.add(cb.equal(root.get("action"), action.trim()));
            }
            if (hasText(entityType)) {
                predicates.add(cb.equal(root.get("entityType"), entityType.trim()));
            }
            if (actorUserId != null) {
                predicates.add(cb.equal(root.get("actorUserId"), actorUserId));
            }
            if (hasText(source)) {
                predicates.add(cb.equal(root.get("source"), source.trim()));
            }
            if (success != null) {
                predicates.add(cb.equal(root.get("success"), success));
            }
            if (dateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), dateFrom));
            }
            if (dateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), dateTo));
            }
            if (hasText(search)) {
                predicates.add(searchPredicate(root, cb, search.trim().toLowerCase()));
            }

            if (predicates.isEmpty()) {
                return cb.conjunction();
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static Predicate searchPredicate(Root<AuditLog> root, CriteriaBuilder cb, String lowered) {
        String pattern = "%" + escapeLike(lowered) + "%";
        return cb.or(
                likeIgnoreCase(cb, root.get("actorName"), pattern),
                likeIgnoreCase(cb, root.get("actorEmail"), pattern),
                likeIgnoreCase(cb, root.get("description"), pattern),
                likeIgnoreCase(cb, root.get("entityDisplay"), pattern)
        );
    }

    private static Predicate likeIgnoreCase(
            CriteriaBuilder cb,
            Expression<String> path,
            String pattern) {
        Expression<String> coalesced = cb.coalesce(path, "");
        return cb.like(cb.lower(coalesced), pattern, '\\');
    }

    private static String escapeLike(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
