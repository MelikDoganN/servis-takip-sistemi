package com.servis.backend.service;

import com.servis.backend.entity.Customer;
import com.servis.backend.entity.Device;
import com.servis.backend.entity.DeviceModel;
import com.servis.backend.repository.CustomerRepository;
import com.servis.backend.repository.DeviceModelRepository;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.WorkOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class DeviceService {

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private DeviceModelRepository deviceModelRepository;

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Autowired
    private WarrantyService warrantyService;

    public List<Device> getAllDevices() {
        return deviceRepository.findAll();
    }

    public Device getDeviceById(Long id) {
        return deviceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cihaz bulunamadı: " + id));
    }

    @Transactional
    public Device createDevice(Device device) {
        Long customerId = requireAssociationId(device.getCustomer(), "Müşteri zorunludur");
        Long modelId = requireAssociationId(device.getModel(), "Model zorunludur");
        String serial = requireSerial(device.getSerialNumber());

        if (deviceRepository.findBySerialNumber(serial).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bu seri numarası zaten kayıtlı: " + serial
            );
        }

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Müşteri bulunamadı: " + customerId));
        DeviceModel model = deviceModelRepository.findById(modelId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Model bulunamadı: " + modelId));

        Device toSave = new Device();
        toSave.setCustomer(customer);
        toSave.setModel(model);
        toSave.setSerialNumber(serial);
        toSave.setPurchaseDate(device.getPurchaseDate());
        toSave.setInstallationDate(device.getInstallationDate());
        Device saved = deviceRepository.save(toSave);

        // Tarih + GENERAL ay tanımlıysa otomatik GENERAL kaydı (duplicate üretmez)
        warrantyService.tryCreateGeneralWarrantyIfPossible(saved.getId());

        return saved;
    }

    public Device updateDevice(Long id, Device deviceDetails) {
        Device existing = getDeviceById(id);

        Long customerId = requireAssociationId(deviceDetails.getCustomer(), "Müşteri zorunludur");
        Long modelId = requireAssociationId(deviceDetails.getModel(), "Model zorunludur");
        String serial = requireSerial(deviceDetails.getSerialNumber());

        deviceRepository.findBySerialNumber(serial).ifPresent(other -> {
            if (!other.getId().equals(id)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Bu seri numarası zaten kayıtlı: " + serial
                );
            }
        });

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Müşteri bulunamadı: " + customerId));
        DeviceModel model = deviceModelRepository.findById(modelId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Model bulunamadı: " + modelId));

        existing.setCustomer(customer);
        existing.setModel(model);
        existing.setSerialNumber(serial);
        existing.setPurchaseDate(deviceDetails.getPurchaseDate());
        existing.setInstallationDate(deviceDetails.getInstallationDate());
        return deviceRepository.save(existing);
    }

    public void deleteDevice(Long id) {
        if (!deviceRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Cihaz bulunamadı: " + id);
        }
        if (workOrderRepository.existsByDeviceId(id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bu cihaza bağlı iş emirleri bulunduğu için cihaz silinemez."
            );
        }
        deviceRepository.deleteById(id);
    }

    private static Long requireAssociationId(Object association, String message) {
        if (association == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        if (association instanceof Customer customer) {
            if (customer.getId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
            }
            return customer.getId();
        }
        if (association instanceof DeviceModel model) {
            if (model.getId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
            }
            return model.getId();
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static String requireSerial(String serialNumber) {
        if (serialNumber == null || serialNumber.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seri numarası zorunludur");
        }
        return serialNumber.trim();
    }
}
