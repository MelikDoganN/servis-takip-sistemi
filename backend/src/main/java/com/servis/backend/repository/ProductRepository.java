package com.servis.backend.repository;

import com.servis.backend.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findBySlug(String slug);

    Optional<Product> findBySlugAndActiveTrue(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    List<Product> findByActiveTrueAndFeaturedTrueOrderByUpdatedAtDesc();

    @Query("""
            SELECT p FROM Product p
            LEFT JOIN p.category c
            WHERE (:active IS NULL OR p.active = :active)
              AND (:categorySlug IS NULL OR (c IS NOT NULL AND c.slug = :categorySlug))
              AND (:brand IS NULL OR LOWER(COALESCE(p.brand, '')) = LOWER(:brand))
              AND (
                    :search IS NULL OR :search = ''
                    OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(p.brand, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(p.model, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(p.shortDescription, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(p.slug) LIKE LOWER(CONCAT('%', :search, '%'))
                  )
            """)
    Page<Product> search(
            @Param("active") Boolean active,
            @Param("categorySlug") String categorySlug,
            @Param("brand") String brand,
            @Param("search") String search,
            Pageable pageable);
}
