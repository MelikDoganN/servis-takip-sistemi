package com.servis.backend.api;

import com.servis.backend.entity.Brand;
import com.servis.backend.entity.Customer;
import com.servis.backend.entity.Device;
import com.servis.backend.entity.DeviceModel;
import com.servis.backend.entity.Role;
import com.servis.backend.entity.User;
import com.servis.backend.repository.BrandRepository;
import com.servis.backend.repository.CustomerRepository;
import com.servis.backend.repository.DeviceModelRepository;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.RoleRepository;
import com.servis.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CustomerDeviceApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private DeviceModelRepository deviceModelRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private DeviceModel testModel;
    private Customer testCustomer;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName("ADMIN").orElseGet(() -> {
            Role r = new Role();
            r.setName("ADMIN");
            r.setDescription("Admin");
            return roleRepository.save(r);
        });
        roleRepository.findByName("TECHNICIAN").orElseGet(() -> {
            Role r = new Role();
            r.setName("TECHNICIAN");
            r.setDescription("Technician");
            return roleRepository.save(r);
        });

        if (userRepository.findByEmail("admin@api.test").isEmpty()) {
            User u = new User();
            u.setFullName("Admin");
            u.setEmail("admin@api.test");
            u.setPasswordHash(passwordEncoder.encode("password123"));
            u.setIsActive(true);
            u.setRole(adminRole);
            userRepository.save(u);
        }

        Brand brand = brandRepository.findAll().stream().findFirst().orElseGet(() -> {
            Brand b = new Brand();
            b.setName("TestBrand");
            b.setIsActive(true);
            return brandRepository.save(b);
        });

        testModel = deviceModelRepository.findAll().stream().findFirst().orElseGet(() -> {
            DeviceModel m = new DeviceModel();
            m.setBrand(brand);
            m.setName("Model-X");
            m.setDeviceType("KOMBI");
            m.setGeneralWarrantyMonths(24);
            m.setPartsWarrantyMonths(12);
            m.setLaborWarrantyMonths(12);
            m.setIsActive(true);
            return deviceModelRepository.save(m);
        });

        testCustomer = new Customer();
        testCustomer.setFullName("Cihaz Müşteri");
        testCustomer.setPhone("5551112233");
        testCustomer = customerRepository.save(testCustomer);
    }

    @Test
    @WithMockUser(username = "admin@api.test", authorities = "ROLE_ADMIN")
    void customer_WithoutPhone_Returns400() throws Exception {
        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Adsız","phone":"   "}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "admin@api.test", authorities = "ROLE_ADMIN")
    void customer_ValidCreate_Returns201() throws Exception {
        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Ayşe Yılmaz",
                                  "phone":"5559998877",
                                  "email":"ayse@test.com"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fullName").value("Ayşe Yılmaz"))
                .andExpect(jsonPath("$.phone").value("5559998877"));
    }

    @Test
    @WithMockUser(username = "tech@api.test", authorities = "ROLE_TECHNICIAN")
    void customer_TechnicianCreate_Returns403() throws Exception {
        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Tech Müşteri","phone":"5550001111"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@api.test", authorities = "ROLE_ADMIN")
    void device_MissingCustomer_Returns404() throws Exception {
        String body = """
                {
                  "customer":{"id":999999},
                  "model":{"id":%d},
                  "serialNumber":"SN-MISSING-CUST"
                }
                """.formatted(testModel.getId());

        mockMvc.perform(post("/api/devices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("Müşteri")));
    }

    @Test
    @WithMockUser(username = "admin@api.test", authorities = "ROLE_ADMIN")
    void device_MissingModel_Returns404() throws Exception {
        String body = """
                {
                  "customer":{"id":%d},
                  "model":{"id":999999},
                  "serialNumber":"SN-MISSING-MODEL"
                }
                """.formatted(testCustomer.getId());

        mockMvc.perform(post("/api/devices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("Model")));
    }

    @Test
    @WithMockUser(username = "admin@api.test", authorities = "ROLE_ADMIN")
    void device_DuplicateSerial_Returns409() throws Exception {
        Device existing = new Device();
        existing.setCustomer(testCustomer);
        existing.setModel(testModel);
        existing.setSerialNumber("SN-DUP-001");
        deviceRepository.save(existing);

        String body = """
                {
                  "customer":{"id":%d},
                  "model":{"id":%d},
                  "serialNumber":"SN-DUP-001"
                }
                """.formatted(testCustomer.getId(), testModel.getId());

        mockMvc.perform(post("/api/devices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser(username = "admin@api.test", authorities = "ROLE_ADMIN")
    void device_UpdateOwnSerial_Succeeds() throws Exception {
        Device existing = new Device();
        existing.setCustomer(testCustomer);
        existing.setModel(testModel);
        existing.setSerialNumber("SN-OWN-001");
        existing = deviceRepository.save(existing);

        String body = """
                {
                  "customer":{"id":%d},
                  "model":{"id":%d},
                  "serialNumber":"SN-OWN-001"
                }
                """.formatted(testCustomer.getId(), testModel.getId());

        mockMvc.perform(put("/api/devices/" + existing.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.serialNumber").value("SN-OWN-001"));
    }

    @Test
    @WithMockUser(username = "admin@api.test", authorities = "ROLE_ADMIN")
    void device_UpdateToOtherSerial_Returns409() throws Exception {
        Device first = new Device();
        first.setCustomer(testCustomer);
        first.setModel(testModel);
        first.setSerialNumber("SN-A");
        deviceRepository.save(first);

        Device second = new Device();
        second.setCustomer(testCustomer);
        second.setModel(testModel);
        second.setSerialNumber("SN-B");
        second = deviceRepository.save(second);

        String body = """
                {
                  "customer":{"id":%d},
                  "model":{"id":%d},
                  "serialNumber":"SN-A"
                }
                """.formatted(testCustomer.getId(), testModel.getId());

        mockMvc.perform(put("/api/devices/" + second.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser(username = "tech@api.test", authorities = "ROLE_TECHNICIAN")
    void device_TechnicianCreate_Returns403() throws Exception {
        String body = """
                {
                  "customer":{"id":%d},
                  "model":{"id":%d},
                  "serialNumber":"SN-TECH-FORBIDDEN"
                }
                """.formatted(testCustomer.getId(), testModel.getId());

        mockMvc.perform(post("/api/devices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "tech@api.test", authorities = "ROLE_TECHNICIAN")
    void device_TechnicianDelete_Returns403() throws Exception {
        Device existing = new Device();
        existing.setCustomer(testCustomer);
        existing.setModel(testModel);
        existing.setSerialNumber("SN-DEL-TECH");
        existing = deviceRepository.save(existing);

        mockMvc.perform(delete("/api/devices/" + existing.getId()))
                .andExpect(status().isForbidden());
    }
}
