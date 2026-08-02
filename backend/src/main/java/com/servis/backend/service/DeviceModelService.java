package com.servis.backend.service;

import com.servis.backend.dto.CreateDeviceModelRequest;
import com.servis.backend.dto.UpdateDeviceModelRequest;
import com.servis.backend.entity.Brand;
import com.servis.backend.entity.DeviceModel;
import com.servis.backend.repository.BrandRepository;
import com.servis.backend.repository.DeviceModelRepository;
import com.servis.backend.repository.DeviceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class DeviceModelService {

    @Autowired
    private DeviceModelRepository deviceModelRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    public List<DeviceModel> getModels(Long brandId) {
        if (brandId != null) {
            return deviceModelRepository.findByBrandId(brandId);
        }
        return deviceModelRepository.findAll();
    }

    public DeviceModel getModelById(Long id) {
        return deviceModelRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Model bulunamadı: " + id));
    }

    public DeviceModel createModel(CreateDeviceModelRequest request) {
        Brand brand = resolveBrand(request.getBrandId());
        String name = requireName(request.getName());
        assertNameAvailable(brand.getId(), name, null);

        DeviceModel model = new DeviceModel();
        applyFields(model, brand, name, request.getDeviceType(),
                request.getGeneralWarrantyMonths(),
                request.getPartsWarrantyMonths(),
                request.getLaborWarrantyMonths());
        return deviceModelRepository.save(model);
    }

    public DeviceModel updateModel(Long id, UpdateDeviceModelRequest request) {
        DeviceModel existing = getModelById(id);
        Brand brand = resolveBrand(request.getBrandId());
        String name = requireName(request.getName());
        assertNameAvailable(brand.getId(), name, id);

        applyFields(existing, brand, name, request.getDeviceType(),
                request.getGeneralWarrantyMonths(),
                request.getPartsWarrantyMonths(),
                request.getLaborWarrantyMonths());
        return deviceModelRepository.save(existing);
    }

    public void deleteModel(Long id) {
        if (!deviceModelRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Model bulunamadı: " + id);
        }
        if (deviceRepository.existsByModelId(id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bu modele bağlı cihazlar bulunduğu için model silinemez."
            );
        }
        deviceModelRepository.deleteById(id);
    }

    private Brand resolveBrand(Long brandId) {
        if (brandId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Marka zorunludur");
        }
        return brandRepository.findById(brandId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Marka bulunamadı: " + brandId));
    }

    private void assertNameAvailable(Long brandId, String name, Long excludeId) {
        boolean taken = excludeId == null
                ? deviceModelRepository.existsByBrandIdAndNameIgnoreCase(brandId, name)
                : deviceModelRepository.existsByBrandIdAndNameIgnoreCaseAndIdNot(brandId, name, excludeId);
        if (taken) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bu marka altında aynı isimde bir model zaten kayıtlı."
            );
        }
    }

    private void applyFields(DeviceModel model, Brand brand, String name, String deviceType,
                             Integer generalMonths, Integer partsMonths, Integer laborMonths) {
        if (deviceType == null || deviceType.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cihaz türü zorunludur");
        }
        validateMonths(generalMonths, "Genel");
        validateMonths(partsMonths, "Parça");
        validateMonths(laborMonths, "İşçilik");

        model.setBrand(brand);
        model.setName(name);
        model.setDeviceType(deviceType.trim());
        model.setGeneralWarrantyMonths(generalMonths);
        model.setPartsWarrantyMonths(partsMonths);
        model.setLaborWarrantyMonths(laborMonths);
        if (model.getIsActive() == null) {
            model.setIsActive(true);
        }
    }

    private static void validateMonths(Integer months, String label) {
        if (months == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " garanti ayı zorunludur");
        }
        if (months < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, label + " garanti ayı negatif olamaz");
        }
    }

    private static String requireName(String name) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Model adı zorunludur");
        }
        return name.trim();
    }
}
