package com.servis.backend.service;

import com.servis.backend.dto.CreateBrandRequest;
import com.servis.backend.dto.UpdateBrandRequest;
import com.servis.backend.entity.Brand;
import com.servis.backend.repository.BrandRepository;
import com.servis.backend.repository.DeviceModelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class BrandService {

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private DeviceModelRepository deviceModelRepository;

    public List<Brand> getAllBrands() {
        return brandRepository.findAll();
    }

    public Brand getBrandById(Long id) {
        return brandRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Marka bulunamadı: " + id));
    }

    public Brand createBrand(CreateBrandRequest request) {
        String name = requireName(request.getName());
        if (brandRepository.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu marka zaten kayıtlı.");
        }
        Brand brand = new Brand();
        brand.setName(name);
        brand.setDescription(blankToNull(request.getDescription()));
        brand.setIsActive(true);
        return brandRepository.save(brand);
    }

    public Brand updateBrand(Long id, UpdateBrandRequest request) {
        Brand existing = getBrandById(id);
        String name = requireName(request.getName());
        if (brandRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bu marka zaten kayıtlı.");
        }
        existing.setName(name);
        existing.setDescription(blankToNull(request.getDescription()));
        return brandRepository.save(existing);
    }

    public void deleteBrand(Long id) {
        if (!brandRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Marka bulunamadı: " + id);
        }
        if (deviceModelRepository.existsByBrandId(id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bu markaya bağlı modeller bulunduğu için marka silinemez."
            );
        }
        brandRepository.deleteById(id);
    }

    private static String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Marka adı zorunludur");
        }
        return name.trim();
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
