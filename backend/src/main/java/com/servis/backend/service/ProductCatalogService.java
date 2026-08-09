package com.servis.backend.service;

import com.servis.backend.catalog.ProductStockStatuses;
import com.servis.backend.dto.CreateProductCategoryRequest;
import com.servis.backend.dto.CreateProductRequest;
import com.servis.backend.dto.ProductCategoryDto;
import com.servis.backend.dto.ProductDto;
import com.servis.backend.dto.UpdateProductRequest;
import com.servis.backend.entity.Product;
import com.servis.backend.entity.ProductCategory;
import com.servis.backend.repository.ProductCategoryRepository;
import com.servis.backend.repository.ProductRepository;
import com.servis.backend.util.SlugUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

@Service
public class ProductCatalogService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductCategoryRepository categoryRepository;

    /* ---------- Public ---------- */

    @Transactional(readOnly = true)
    public Page<ProductDto> listPublic(
            String categorySlug,
            String brand,
            String search,
            int page,
            int size) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 50),
                Sort.by(Sort.Direction.DESC, "featured").and(Sort.by(Sort.Direction.DESC, "updatedAt"))
        );
        return productRepository.search(
                true,
                blankToNull(categorySlug),
                blankToNull(brand),
                blankToNull(search),
                pageable
        ).map(this::toPublicDto);
    }

    @Transactional(readOnly = true)
    public ProductDto getPublicBySlug(String slug) {
        Product product = productRepository.findBySlugAndActiveTrue(requireSlug(slug))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ürün bulunamadı"));
        return toPublicDto(product);
    }

    @Transactional(readOnly = true)
    public List<ProductDto> listFeaturedPublic() {
        return productRepository.findByActiveTrueAndFeaturedTrueOrderByUpdatedAtDesc().stream()
                .map(this::toPublicDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductCategoryDto> listPublicCategories() {
        return categoryRepository.findByActiveTrueOrderBySortOrderAscNameAsc().stream()
                .map(this::toCategoryDto)
                .toList();
    }

    /* ---------- Admin products ---------- */

    @Transactional(readOnly = true)
    public Page<ProductDto> listAdmin(
            String categorySlug,
            String brand,
            String search,
            Boolean active,
            int page,
            int size) {
        Pageable pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "updatedAt")
        );
        return productRepository.search(
                active,
                blankToNull(categorySlug),
                blankToNull(brand),
                blankToNull(search),
                pageable
        ).map(this::toAdminDto);
    }

    @Transactional(readOnly = true)
    public ProductDto getAdminById(Long id) {
        return toAdminDto(getProduct(id));
    }

    @Transactional
    public ProductDto createProduct(CreateProductRequest request) {
        String slug = resolveUniqueSlug(request.getSlug(), request.getName(), null);
        Product product = new Product();
        applyCreate(product, request, slug);
        return toAdminDto(productRepository.save(product));
    }

    @Transactional
    public ProductDto updateProduct(Long id, UpdateProductRequest request) {
        Product product = getProduct(id);
        String slug = resolveUniqueSlug(request.getSlug(), request.getName(), id);
        applyUpdate(product, request, slug);
        return toAdminDto(productRepository.save(product));
    }

    /** Soft-disable: active=false */
    @Transactional
    public ProductDto deactivateProduct(Long id) {
        Product product = getProduct(id);
        product.setActive(false);
        return toAdminDto(productRepository.save(product));
    }

    @Transactional
    public ProductCategoryDto createCategory(CreateProductCategoryRequest request) {
        String slug = resolveUniqueCategorySlug(request.getSlug(), request.getName(), null);
        ProductCategory cat = new ProductCategory();
        cat.setName(request.getName().trim());
        cat.setSlug(slug);
        cat.setDescription(blankToNull(request.getDescription()));
        cat.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);
        cat.setActive(request.getActive() == null || request.getActive());
        return toCategoryDto(categoryRepository.save(cat));
    }

    /* ---------- helpers ---------- */

    private Product getProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ürün bulunamadı"));
    }

    private void applyCreate(Product product, CreateProductRequest request, String slug) {
        product.setName(request.getName().trim());
        product.setSlug(slug);
        product.setBrand(blankToNull(request.getBrand()));
        product.setModel(blankToNull(request.getModel()));
        product.setCategory(resolveCategory(request.getCategoryId()));
        product.setShortDescription(blankToNull(request.getShortDescription()));
        product.setDescription(blankToNull(request.getDescription()));
        product.setPrice(normalizePrice(request.getPrice()));
        product.setCurrency(request.getCurrency() != null && !request.getCurrency().isBlank()
                ? request.getCurrency().trim().toUpperCase() : "TRY");
        product.setImageUrl(blankToNull(request.getImageUrl()));
        product.setActive(request.getActive() == null || request.getActive());
        product.setFeatured(Boolean.TRUE.equals(request.getFeatured()));
        product.setStockStatus(ProductStockStatuses.normalize(request.getStockStatus()));
    }

    private void applyUpdate(Product product, UpdateProductRequest request, String slug) {
        product.setName(request.getName().trim());
        product.setSlug(slug);
        product.setBrand(blankToNull(request.getBrand()));
        product.setModel(blankToNull(request.getModel()));
        product.setCategory(resolveCategory(request.getCategoryId()));
        product.setShortDescription(blankToNull(request.getShortDescription()));
        product.setDescription(blankToNull(request.getDescription()));
        product.setPrice(normalizePrice(request.getPrice()));
        product.setCurrency(request.getCurrency() != null && !request.getCurrency().isBlank()
                ? request.getCurrency().trim().toUpperCase() : "TRY");
        product.setImageUrl(blankToNull(request.getImageUrl()));
        if (request.getActive() != null) {
            product.setActive(request.getActive());
        }
        if (request.getFeatured() != null) {
            product.setFeatured(request.getFeatured());
        }
        product.setStockStatus(ProductStockStatuses.normalize(request.getStockStatus()));
    }

    private ProductCategory resolveCategory(Long categoryId) {
        if (categoryId == null) {
            return null;
        }
        return categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kategori bulunamadı"));
    }

    private BigDecimal normalizePrice(BigDecimal price) {
        if (price == null) {
            return null;
        }
        if (price.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fiyat negatif olamaz");
        }
        return price;
    }

    private String resolveUniqueSlug(String requested, String name, Long excludeId) {
        String base = SlugUtils.slugify(requested != null && !requested.isBlank() ? requested : name);
        if (base.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geçerli bir slug üretilemedi");
        }
        String candidate = base;
        int i = 2;
        while (slugTaken(candidate, excludeId)) {
            candidate = base + "-" + i;
            i++;
            if (i > 1000) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Slug çakışması");
            }
        }
        return candidate;
    }

    private boolean slugTaken(String slug, Long excludeId) {
        if (excludeId == null) {
            return productRepository.existsBySlug(slug);
        }
        return productRepository.existsBySlugAndIdNot(slug, excludeId);
    }

    private String resolveUniqueCategorySlug(String requested, String name, Long excludeId) {
        String base = SlugUtils.slugify(requested != null && !requested.isBlank() ? requested : name);
        if (base.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Geçerli bir slug üretilemedi");
        }
        String candidate = base;
        int i = 2;
        while (categorySlugTaken(candidate, excludeId)) {
            candidate = base + "-" + i;
            i++;
        }
        return candidate;
    }

    private boolean categorySlugTaken(String slug, Long excludeId) {
        if (excludeId == null) {
            return categoryRepository.existsBySlug(slug);
        }
        return categoryRepository.existsBySlugAndIdNot(slug, excludeId);
    }

    private String requireSlug(String slug) {
        if (slug == null || slug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slug zorunludur");
        }
        return slug.trim();
    }

    private ProductDto toPublicDto(Product p) {
        ProductDto dto = mapBase(p);
        // Public: active her zaman true; yine de gizleme güvenliği
        dto.setActive(true);
        return dto;
    }

    private ProductDto toAdminDto(Product p) {
        return mapBase(p);
    }

    private ProductDto mapBase(Product p) {
        ProductDto dto = new ProductDto();
        dto.setId(p.getId());
        dto.setName(p.getName());
        dto.setSlug(p.getSlug());
        dto.setBrand(p.getBrand());
        dto.setModel(p.getModel());
        if (p.getCategory() != null) {
            dto.setCategoryId(p.getCategory().getId());
            dto.setCategoryName(p.getCategory().getName());
            dto.setCategorySlug(p.getCategory().getSlug());
        }
        dto.setShortDescription(p.getShortDescription());
        dto.setDescription(p.getDescription());
        dto.setPrice(p.getPrice());
        dto.setCurrency(p.getCurrency());
        dto.setImageUrl(p.getImageUrl());
        dto.setActive(p.getActive());
        dto.setFeatured(p.getFeatured());
        dto.setStockStatus(p.getStockStatus());
        dto.setCreatedAt(p.getCreatedAt());
        dto.setUpdatedAt(p.getUpdatedAt());
        return dto;
    }

    private ProductCategoryDto toCategoryDto(ProductCategory c) {
        ProductCategoryDto dto = new ProductCategoryDto();
        dto.setId(c.getId());
        dto.setName(c.getName());
        dto.setSlug(c.getSlug());
        dto.setDescription(c.getDescription());
        dto.setSortOrder(c.getSortOrder());
        return dto;
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
