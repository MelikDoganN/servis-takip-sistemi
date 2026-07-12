package com.servis.backend.service;

import java.time.LocalDate;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.servis.backend.entity.Device;
import com.servis.backend.entity.WarrantyRecord;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.WarrantyRecordRepository;

@Service
public class WarrantyService {

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private WarrantyRecordRepository warrantyRecordRepository;

    /**
     * 7. GÜN FORMÜLÜ: G = T_başlangıç + F_süre
     * T_başlangıç = Cihazın satın alma tarihi (yoksa kurulum tarihi)
     * F_süre = DeviceModel'deki ilgili garanti ayı (PARTS, LABOR, GENERAL)
     */
    @Transactional
    public WarrantyRecord createWarrantyRecord(Long deviceId, String warrantyType) {
        // 1. Cihazı bul
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new RuntimeException("Cihaz bulunamadı: " + deviceId));

        // 2. Garanti tipine göre ay sayısını al (F_süre)
        Integer months;
        switch (warrantyType.toUpperCase()) {
            case "PARTS":
                months = device.getModel().getPartsWarrantyMonths();
                break;
            case "LABOR":
                months = device.getModel().getLaborWarrantyMonths();
                break;
            case "GENERAL":
                months = device.getModel().getGeneralWarrantyMonths();
                break;
            default:
                throw new RuntimeException("Geçersiz garanti tipi: " + warrantyType);
        }

        // Eğer garanti süresi tanımlı değilse (null veya 0) hata ver
        if (months == null || months == 0) {
            throw new RuntimeException("Bu model için " + warrantyType + " garantisi tanımlı değil.");
        }

        // 3. Başlangıç tarihini belirle (T_başlangıç)
        LocalDate startDate = device.getPurchaseDate();
        if (startDate == null) {
            startDate = device.getInstallationDate();
        }
        if (startDate == null) {
            throw new RuntimeException("Cihazın satın alma veya kurulum tarihi bulunamadı.");
        }

        // 4. Bitiş tarihini hesapla (G = T_başlangıç + F_süre)
        LocalDate endDate = startDate.plusMonths(months);

        // 5. WarrantyRecord oluştur ve kaydet
        WarrantyRecord record = new WarrantyRecord();
        record.setDevice(device);
        record.setWarrantyType(warrantyType.toUpperCase());
        record.setStartDate(startDate);
        record.setEndDate(endDate);
        record.setDescription(months + " ay " + warrantyType + " garantisi");

        return warrantyRecordRepository.save(record);
    }

    /**
     * Bir cihazın belirtilen garanti tipi kapsamında hala garantili olup olmadığını kontrol eder.
     */
    public boolean isUnderWarranty(Long deviceId, String warrantyType) {
        Optional<WarrantyRecord> record = warrantyRecordRepository
                .findByDeviceIdAndWarrantyType(deviceId, warrantyType.toUpperCase());

        if (record.isPresent()) {
            // Bugün tarihi, bitiş tarihinden önce mi (veya eşit mi)? 
            // Çoğu durumda eşit olabilir, ama genelde "after" kontrolü yapılır.
            return record.get().getEndDate().isAfter(LocalDate.now());
        }
        return false; // Kayıt yoksa garantisizdir.
    }
}