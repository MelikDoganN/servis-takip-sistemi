package com.servis.backend.controller;

import com.servis.backend.dto.CreateProductCategoryRequest;
import com.servis.backend.dto.CreateProductRequest;
import com.servis.backend.dto.ProductCategoryDto;
import com.servis.backend.dto.ProductDto;
import com.servis.backend.dto.UpdateProductRequest;
import com.servis.backend.service.ProductCatalogService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
@PreAuthorize("hasRole('ADMIN')")
public class ProductController {

    @Autowired
    private ProductCatalogService productCatalogService;

    @GetMapping
    public Page<ProductDto> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return productCatalogService.listAdmin(category, brand, search, active, page, size);
    }

    @GetMapping("/{id}")
    public ProductDto getById(@PathVariable Long id) {
        return productCatalogService.getAdminById(id);
    }

    @PostMapping
    public ResponseEntity<ProductDto> create(@Valid @RequestBody CreateProductRequest request) {
        return new ResponseEntity<>(productCatalogService.createProduct(request), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ProductDto update(@PathVariable Long id, @Valid @RequestBody UpdateProductRequest request) {
        return productCatalogService.updateProduct(id, request);
    }

    /** Soft-disable: active=false */
    @DeleteMapping("/{id}")
    public ProductDto deactivate(@PathVariable Long id) {
        return productCatalogService.deactivateProduct(id);
    }

    @PostMapping("/categories")
    public ResponseEntity<ProductCategoryDto> createCategory(
            @Valid @RequestBody CreateProductCategoryRequest request) {
        return new ResponseEntity<>(productCatalogService.createCategory(request), HttpStatus.CREATED);
    }
}
