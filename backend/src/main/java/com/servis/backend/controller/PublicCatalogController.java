package com.servis.backend.controller;

import com.servis.backend.dto.ProductCategoryDto;
import com.servis.backend.dto.ProductDto;
import com.servis.backend.dto.PublicServiceStatusDto;
import com.servis.backend.dto.PublicWarrantyDto;
import com.servis.backend.service.ProductCatalogService;
import com.servis.backend.service.PublicLookupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Kimlik doğrulamasız public API — yalnız public-safe alanlar.
 */
@RestController
@RequestMapping("/api/public")
public class PublicCatalogController {

    @Autowired
    private ProductCatalogService productCatalogService;

    @Autowired
    private PublicLookupService publicLookupService;

    @GetMapping("/products")
    public Page<ProductDto> listProducts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        return productCatalogService.listPublic(category, brand, search, page, size);
    }

    @GetMapping("/products/featured")
    public List<ProductDto> featuredProducts() {
        return productCatalogService.listFeaturedPublic();
    }

    @GetMapping("/products/{slug}")
    public ProductDto getBySlug(@PathVariable String slug) {
        return productCatalogService.getPublicBySlug(slug);
    }

    @GetMapping("/categories")
    public List<ProductCategoryDto> categories() {
        return productCatalogService.listPublicCategories();
    }

    /** Public garanti — müşteri PII dönmez. */
    @GetMapping("/warranty/{serialNumber}")
    public PublicWarrantyDto warrantyBySerial(@PathVariable String serialNumber) {
        return publicLookupService.lookupWarranty(serialNumber);
    }

    /**
     * Public servis durumu — phone zorunlu; ownership yoksa güvenli 404.
     */
    @GetMapping("/service/{serviceNumber}")
    public PublicServiceStatusDto serviceByNumber(
            @PathVariable String serviceNumber,
            @RequestParam String phone) {
        return publicLookupService.lookupService(serviceNumber, phone);
    }
}
