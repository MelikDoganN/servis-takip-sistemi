package com.servis.backend.service;

import com.servis.backend.entity.*;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.WarrantyRecordRepository;
import com.servis.backend.repository.WorkOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

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

    @Mock
    private WorkOrderRepository workOrderRepository;

    @Mock
    private AuditLogService auditLogService;

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
        when(warrantyRecordRepository.findByDeviceIdAndWarrantyType(1L, "PARTS"))
                .thenReturn(Optional.empty());
        when(warrantyRecordRepository.save(any(WarrantyRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WarrantyRecord record = warrantyService.createWarrantyRecord(1L, "PARTS");

        assertNotNull(record);
        assertEquals("PARTS", record.getWarrantyType());
        assertEquals(LocalDate.of(2025, 1, 1), record.getStartDate());
        assertEquals(LocalDate.of(2027, 1, 1), record.getEndDate());
    }

    @Test
    void createWarrantyRecord_WithNoPurchaseDate_ShouldUseInstallationDate() {
        device.setPurchaseDate(null);
        device.setInstallationDate(LocalDate.of(2025, 6, 1));

        when(deviceRepository.findById(1L)).thenReturn(Optional.of(device));
        when(warrantyRecordRepository.findByDeviceIdAndWarrantyType(1L, "LABOR"))
                .thenReturn(Optional.empty());
        when(warrantyRecordRepository.save(any(WarrantyRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WarrantyRecord record = warrantyService.createWarrantyRecord(1L, "LABOR");

        assertEquals(LocalDate.of(2025, 6, 1), record.getStartDate());
        assertEquals(LocalDate.of(2026, 6, 1), record.getEndDate());
    }

    @Test
    void createWarrantyRecord_NegativeMonths_Throws400() {
        model.setPartsWarrantyMonths(-1);
        when(deviceRepository.findById(1L)).thenReturn(Optional.of(device));
        when(warrantyRecordRepository.findByDeviceIdAndWarrantyType(1L, "PARTS"))
                .thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> warrantyService.createWarrantyRecord(1L, "PARTS")
        );
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void createWarrantyRecord_NullMonths_Throws400() {
        model.setPartsWarrantyMonths(null);
        when(deviceRepository.findById(1L)).thenReturn(Optional.of(device));
        when(warrantyRecordRepository.findByDeviceIdAndWarrantyType(1L, "PARTS"))
                .thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(
                ResponseStatusException.class,
                () -> warrantyService.createWarrantyRecord(1L, "PARTS")
        );
        assertEquals(400, ex.getStatusCode().value());
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
