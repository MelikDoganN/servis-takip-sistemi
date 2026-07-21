package com.servis.backend.service;

import com.servis.backend.entity.Device;
import com.servis.backend.repository.DeviceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DeviceService {

    @Autowired
    private DeviceRepository deviceRepository;

    // Sayfalama destekli cihaz listesi
    public Page<Device> getAllDevices(Pageable pageable) {
        return deviceRepository.findAll(pageable);
    }

    // Tüm cihazlar (eski metot, sayfalama yok)
    public List<Device> getAllDevices() {
        return deviceRepository.findAll();
    }

    public Device getDeviceById(Long id) {
        return deviceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cihaz bulunamadı: " + id));
    }

    public Device createDevice(Device device) {
        if (deviceRepository.findBySerialNumber(device.getSerialNumber()).isPresent()) {
            throw new RuntimeException("Bu seri numarası zaten kayıtlı: " + device.getSerialNumber());
        }
        return deviceRepository.save(device);
    }

    public Device updateDevice(Long id, Device deviceDetails) {
        Device existing = getDeviceById(id);
        existing.setCustomer(deviceDetails.getCustomer());
        existing.setModel(deviceDetails.getModel());
        existing.setSerialNumber(deviceDetails.getSerialNumber());
        existing.setPurchaseDate(deviceDetails.getPurchaseDate());
        existing.setInstallationDate(deviceDetails.getInstallationDate());
        return deviceRepository.save(existing);
    }

    public void deleteDevice(Long id) {
        deviceRepository.deleteById(id);
    }
}