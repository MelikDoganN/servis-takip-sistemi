package com.servis.backend.service;

import com.servis.backend.entity.*;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.WarrantyRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WarrantyServiceTest {

    @Mock
    private DeviceRepository deviceRepository;

    @Mock
    private WarrantyRecordRepository warrantyRecordRepository;

    @InjectMocks
    private WarrantyService warrantyService;

    private Device device;
    private DeviceModel model;
    private Customer customer;

    @BeforeEach
    void setUp() {
        customer = new Customer();
        customer.setId(1L);

        model = new DeviceModel();
        model.setId(1L);
        model.setPartsWarrantyMonths(24);
        model.setLaborWarrantyMonths(12);
        model.setGeneralWarrantyMonths(36);

        device = new Device();
        device.setId(1L);
        device.setModel(model);
        device.setPurchaseDate(LocalDate.of(2025, 1, 1));
        device.setCustomer(customer);
    }

    @Test
    void createWarrantyRecord_Parts_ShouldCalculateCorrectEndDate() {
        when(deviceRepository.findById(1L)).thenReturn(Optional.of(device));
        when(warrantyRecordRepository.save(any(WarrantyRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WarrantyRecord record = warrantyService.createWarrantyRecord(1L, "PARTS");

        assertNotNull(record);
        assertEquals("PARTS", record.getWarrantyType());
        assertEquals(LocalDate.of(2025, 1, 1), record.getStartDate());
        assertEquals(LocalDate.of(2027, 1, 1), record.getEndDate()); // 24 ay eklendi
    }

    @Test
    void createWarrantyRecord_WithNoPurchaseDate_ShouldUseInstallationDate() {
        device.setPurchaseDate(null);
        device.setInstallationDate(LocalDate.of(2025, 6, 1));

        when(deviceRepository.findById(1L)).thenReturn(Optional.of(device));
        when(warrantyRecordRepository.save(any(WarrantyRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WarrantyRecord record = warrantyService.createWarrantyRecord(1L, "LABOR");

        assertEquals(LocalDate.of(2025, 6, 1), record.getStartDate());
        assertEquals(LocalDate.of(2026, 6, 1), record.getEndDate()); // 12 ay
    }

    @Test
    void isUnderWarranty_ShouldReturnTrue_WhenEndDateIsFuture() {
        WarrantyRecord record = new WarrantyRecord();
        record.setEndDate(LocalDate.now().plusMonths(5));

        when(warrantyRecordRepository.findByDeviceIdAndWarrantyType(1L, "PARTS"))
                .thenReturn(Optional.of(record));

        boolean result = warrantyService.isUnderWarranty(1L, "PARTS");
        assertTrue(result);
    }

    @Test
    void isUnderWarranty_ShouldReturnFalse_WhenEndDateIsPast() {
        WarrantyRecord record = new WarrantyRecord();
        record.setEndDate(LocalDate.now().minusMonths(1));

        when(warrantyRecordRepository.findByDeviceIdAndWarrantyType(1L, "PARTS"))
                .thenReturn(Optional.of(record));

        boolean result = warrantyService.isUnderWarranty(1L, "PARTS");
        assertFalse(result);
    }
}