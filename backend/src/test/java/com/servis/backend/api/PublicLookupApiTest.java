package com.servis.backend.api;

import com.servis.backend.entity.Brand;
import com.servis.backend.entity.Customer;
import com.servis.backend.entity.Device;
import com.servis.backend.entity.DeviceModel;
import com.servis.backend.entity.Role;
import com.servis.backend.entity.Technician;
import com.servis.backend.entity.User;
import com.servis.backend.entity.WarrantyRecord;
import com.servis.backend.entity.WorkOrder;
import com.servis.backend.repository.BrandRepository;
import com.servis.backend.repository.CustomerRepository;
import com.servis.backend.repository.DeviceModelRepository;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.RegionRepository;
import com.servis.backend.repository.RoleRepository;
import com.servis.backend.repository.TechnicianRepository;
import com.servis.backend.repository.UserRepository;
import com.servis.backend.repository.WarrantyRecordRepository;
import com.servis.backend.repository.WorkOrderRepository;
import com.servis.backend.entity.Region;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PublicLookupApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private DeviceModelRepository deviceModelRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private WorkOrderRepository workOrderRepository;

    @Autowired
    private WarrantyRecordRepository warrantyRecordRepository;

    @Autowired
    private TechnicianRepository technicianRepository;

    @Autowired
    private RegionRepository regionRepository;

    private Customer owner;
    private Customer other;
    private Device device;
    private WorkOrder workOrder;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName("ADMIN").orElseGet(() -> {
            Role r = new Role();
            r.setName("ADMIN");
            r.setDescription("Admin");
            return roleRepository.save(r);
        });
        Role techRole = roleRepository.findByName("TECHNICIAN").orElseGet(() -> {
            Role r = new Role();
            r.setName("TECHNICIAN");
            r.setDescription("Tech");
            return roleRepository.save(r);
        });

        User admin = userRepository.findByEmail("public.lookup.admin@test.com").orElseGet(() -> {
            User u = new User();
            u.setFullName("Lookup Admin");
            u.setEmail("public.lookup.admin@test.com");
            u.setPasswordHash(passwordEncoder.encode("password123"));
            u.setIsActive(true);
            u.setRole(adminRole);
            return userRepository.save(u);
        });

        Region region = regionRepository.findAll().stream().findFirst().orElseGet(() -> {
            Region r = new Region();
            r.setName("Lookup Bölge");
            return regionRepository.save(r);
        });

        User techUser = userRepository.findByEmail("public.lookup.tech@test.com").orElseGet(() -> {
            User u = new User();
            u.setFullName("Miraç Teknisyen");
            u.setEmail("public.lookup.tech@test.com");
            u.setPasswordHash(passwordEncoder.encode("password123"));
            u.setIsActive(true);
            u.setRole(techRole);
            return userRepository.save(u);
        });

        Technician technician = technicianRepository.findAll().stream()
                .filter(t -> t.getUser() != null && "public.lookup.tech@test.com".equals(t.getUser().getEmail()))
                .findFirst()
                .orElseGet(() -> {
                    Technician t = new Technician();
                    t.setUser(techUser);
                    t.setRegion(region);
                    t.setWhatsappNumber("905551112233");
                    t.setCurrentWorkload(0);
                    t.setIsAvailable(true);
                    return technicianRepository.save(t);
                });

        Brand brand = brandRepository.findAll().stream().findFirst().orElseGet(() -> {
            Brand b = new Brand();
            b.setName("PublicBrand");
            b.setIsActive(true);
            return brandRepository.save(b);
        });

        DeviceModel model = deviceModelRepository.findAll().stream().findFirst().orElseGet(() -> {
            DeviceModel m = new DeviceModel();
            m.setBrand(brand);
            m.setName("PublicModel");
            m.setGeneralWarrantyMonths(24);
            m.setIsActive(true);
            return deviceModelRepository.save(m);
        });

        owner = customerRepository.findByPhone("5551112233").orElseGet(() -> {
            Customer c = new Customer();
            c.setFullName("Sahip Müşteri");
            c.setPhone("5551112233");
            c.setWhatsappNumber("905551112233");
            c.setEmail("owner.secret@test.com");
            c.setAddress("Gizli Adres 1");
            return customerRepository.save(c);
        });

        other = customerRepository.findByPhone("5559998877").orElseGet(() -> {
            Customer c = new Customer();
            c.setFullName("Başka Müşteri");
            c.setPhone("5559998877");
            c.setWhatsappNumber("905559998877");
            return customerRepository.save(c);
        });

        device = deviceRepository.findBySerialNumber("PUB-SN-1001").orElseGet(() -> {
            Device d = new Device();
            d.setCustomer(owner);
            d.setModel(model);
            d.setSerialNumber("PUB-SN-1001");
            d.setPurchaseDate(LocalDate.of(2025, 1, 15));
            return deviceRepository.save(d);
        });

        if (warrantyRecordRepository.findByDeviceIdAndWarrantyType(device.getId(), "GENERAL").isEmpty()) {
            WarrantyRecord wr = new WarrantyRecord();
            wr.setDevice(device);
            wr.setWarrantyType("GENERAL");
            wr.setStartDate(LocalDate.of(2025, 1, 15));
            wr.setEndDate(LocalDate.of(2027, 1, 15));
            wr.setDescription("24 ay GENERAL");
            warrantyRecordRepository.save(wr);
        }

        workOrder = workOrderRepository.findByServiceNumber("SRV-2026-000901").orElseGet(() -> {
            WorkOrder wo = new WorkOrder();
            wo.setServiceNumber("SRV-2026-000901");
            wo.setCustomer(owner);
            wo.setDevice(device);
            wo.setCreatedBy(admin);
            wo.setTechnician(technician);
            wo.setStatus("IN_PROGRESS");
            wo.setPriority("MEDIUM");
            wo.setServiceType("PAID");
            wo.setDescription("Public lookup test");
            wo.setEstimatedCompletionAt(java.time.LocalDateTime.of(2026, 8, 20, 12, 0));
            return workOrderRepository.save(wo);
        });
    }

    @Test
    void publicWarranty_WorksWithoutAuth_AndHidesCustomerPii() throws Exception {
        String body = mockMvc.perform(get("/api/public/warranty/{serial}", "PUB-SN-1001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.serialNumber").value("PUB-SN-1001"))
                .andExpect(jsonPath("$.brand").exists())
                .andExpect(jsonPath("$.model").exists())
                .andExpect(jsonPath("$.warrantyStart").exists())
                .andExpect(jsonPath("$.warrantyEnd").exists())
                .andExpect(jsonPath("$.warrantyStatus").exists())
                .andExpect(jsonPath("$.customerName").doesNotExist())
                .andExpect(jsonPath("$.customerId").doesNotExist())
                .andExpect(jsonPath("$.serviceHistory").doesNotExist())
                .andReturn()
                .getResponse()
                .getContentAsString();

        org.junit.jupiter.api.Assertions.assertFalse(body.contains("Sahip Müşteri"));
        org.junit.jupiter.api.Assertions.assertFalse(body.contains("owner.secret@test.com"));
        org.junit.jupiter.api.Assertions.assertFalse(body.contains("Gizli Adres"));
        org.junit.jupiter.api.Assertions.assertFalse(body.toLowerCase().contains("customer"));
    }

    @Test
    void publicWarranty_UnknownSerial_404() throws Exception {
        mockMvc.perform(get("/api/public/warranty/{serial}", "NO-SUCH-SERIAL"))
                .andExpect(status().isNotFound());
    }

    @Test
    void publicService_CorrectPhone_Ok() throws Exception {
        mockMvc.perform(get("/api/public/service/{serviceNo}", "SRV-2026-000901")
                        .param("phone", "5551112233"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.serviceNumber").value("SRV-2026-000901"))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.technicianName").value("Miraç Teknisyen"))
                .andExpect(jsonPath("$.estimatedCompletionAt").exists())
                .andExpect(jsonPath("$.updatedAt").exists())
                .andExpect(jsonPath("$.brand").exists())
                .andExpect(jsonPath("$.model").exists())
                .andExpect(jsonPath("$.customerName").doesNotExist())
                .andExpect(jsonPath("$.description").doesNotExist())
                .andExpect(jsonPath("$.id").doesNotExist());
    }

    @Test
    void publicService_WrongPhone_Safe404() throws Exception {
        mockMvc.perform(get("/api/public/service/{serviceNo}", "SRV-2026-000901")
                        .param("phone", other.getPhone()))
                .andExpect(status().isNotFound());
    }

    @Test
    void publicService_MissingPhone_BadRequest() throws Exception {
        mockMvc.perform(get("/api/public/service/{serviceNo}", "SRV-2026-000901"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void publicService_UnknownService_404() throws Exception {
        mockMvc.perform(get("/api/public/service/{serviceNo}", "SRV-2099-999999")
                        .param("phone", "5551112233"))
                .andExpect(status().isNotFound());
    }

    @Test
    void privateWarrantyEndpoint_StillProtected() throws Exception {
        mockMvc.perform(get("/api/warranty/device/{serial}", "PUB-SN-1001"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "public.lookup.admin@test.com", authorities = "ROLE_ADMIN")
    void privateWarrantyEndpoint_AuthWorks() throws Exception {
        mockMvc.perform(get("/api/warranty/device/{serial}", "PUB-SN-1001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.customerName").value("Sahip Müşteri"));
    }
}
