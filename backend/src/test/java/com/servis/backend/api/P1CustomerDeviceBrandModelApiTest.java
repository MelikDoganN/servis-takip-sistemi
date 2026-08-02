package com.servis.backend.api;

import com.servis.backend.entity.Brand;
import com.servis.backend.entity.Customer;
import com.servis.backend.entity.Device;
import com.servis.backend.entity.DeviceModel;
import com.servis.backend.entity.Role;
import com.servis.backend.entity.User;
import com.servis.backend.entity.WorkOrder;
import com.servis.backend.repository.BrandRepository;
import com.servis.backend.repository.CustomerRepository;
import com.servis.backend.repository.DeviceModelRepository;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.RoleRepository;
import com.servis.backend.repository.UserRepository;
import com.servis.backend.repository.WorkOrderRepository;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import com.jayway.jsonpath.JsonPath;

import java.time.LocalDate;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class P1CustomerDeviceBrandModelApiTest {

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
    private WorkOrderRepository workOrderRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Brand brand;
    private DeviceModel model;
    private Customer customer;
    private User adminUser;

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

        adminUser = userRepository.findByEmail("admin@p1.test").orElseGet(() -> {
            User u = new User();
            u.setFullName("P1 Admin");
            u.setEmail("admin@p1.test");
            u.setPasswordHash(passwordEncoder.encode("password123"));
            u.setIsActive(true);
            u.setRole(adminRole);
            return userRepository.save(u);
        });

        brand = new Brand();
        brand.setName("P1-Brand-" + System.nanoTime());
        brand.setIsActive(true);
        brand = brandRepository.save(brand);

        model = new DeviceModel();
        model.setBrand(brand);
        model.setName("P1-Model");
        model.setDeviceType("LAPTOP");
        model.setGeneralWarrantyMonths(24);
        model.setPartsWarrantyMonths(12);
        model.setLaborWarrantyMonths(12);
        model.setIsActive(true);
        model = deviceModelRepository.save(model);

        customer = new Customer();
        customer.setFullName("P1 Müşteri");
        customer.setPhone("5552000001");
        customer.setEmail("p1.customer@test.com");
        customer = customerRepository.save(customer);
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void customer_DuplicatePhone_Returns409() throws Exception {
        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Başka","phone":"5552000001"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value(containsString("telefon")));
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void customer_DuplicateEmail_Returns409() throws Exception {
        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Başka",
                                  "phone":"5552000099",
                                  "email":"p1.customer@test.com"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value(containsString("e-posta")));
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void customer_UpdateOwnPhoneEmail_Succeeds() throws Exception {
        mockMvc.perform(put("/api/customers/" + customer.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"P1 Müşteri",
                                  "phone":"5552000001",
                                  "email":"p1.customer@test.com"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("5552000001"));
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void customer_UpdateToOtherPhone_Returns409() throws Exception {
        Customer other = new Customer();
        other.setFullName("Diğer");
        other.setPhone("5552000002");
        other.setEmail("other@test.com");
        customerRepository.save(other);

        mockMvc.perform(put("/api/customers/" + customer.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"P1 Müşteri",
                                  "phone":"5552000002",
                                  "email":"p1.customer@test.com"
                                }
                                """))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void customer_DeleteWithDevice_Returns409() throws Exception {
        Device device = new Device();
        device.setCustomer(customer);
        device.setModel(model);
        device.setSerialNumber("SN-P1-DEL-CUST");
        deviceRepository.save(device);

        mockMvc.perform(delete("/api/customers/" + customer.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value(containsString("cihazlar")));
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void device_DeleteWithWorkOrder_Returns409() throws Exception {
        Device device = new Device();
        device.setCustomer(customer);
        device.setModel(model);
        device.setSerialNumber("SN-P1-DEL-DEV");
        device = deviceRepository.save(device);

        WorkOrder wo = new WorkOrder();
        wo.setCustomer(customer);
        wo.setDevice(device);
        wo.setCreatedBy(adminUser);
        wo.setDescription("Test iş emri");
        wo.setStatus("OPEN");
        wo.setPriority("MEDIUM");
        wo.setServiceType("PAID");
        workOrderRepository.save(wo);

        mockMvc.perform(delete("/api/devices/" + device.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value(containsString("iş emirleri")));
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void brand_AdminCrud_Succeeds() throws Exception {
        String createBody = """
                {"name":"YeniMarka-%d","description":"desc"}
                """.formatted(System.nanoTime());

        MvcResult created = mockMvc.perform(post("/api/brands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andReturn();

        Integer id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        mockMvc.perform(put("/api/brands/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"GuncelMarka-" + id + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("GuncelMarka-" + id));

        mockMvc.perform(delete("/api/brands/" + id))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "tech@p1.test", authorities = "ROLE_TECHNICIAN")
    void brand_TechnicianCreate_Returns403() throws Exception {
        mockMvc.perform(post("/api/brands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"TechBrand\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "tech@p1.test", authorities = "ROLE_TECHNICIAN")
    void brand_TechnicianUpdateDelete_Returns403() throws Exception {
        mockMvc.perform(put("/api/brands/" + brand.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Hack\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/brands/" + brand.getId()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void brand_Duplicate_Returns409() throws Exception {
        mockMvc.perform(post("/api/brands")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + brand.getName() + "\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("Bu marka zaten kayıtlı."));
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void brand_DeleteWithModels_Returns409() throws Exception {
        mockMvc.perform(delete("/api/brands/" + brand.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value(containsString("modeller")));
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void model_AdminCrud_Succeeds() throws Exception {
        Brand emptyBrand = new Brand();
        emptyBrand.setName("Empty-" + System.nanoTime());
        emptyBrand.setIsActive(true);
        emptyBrand = brandRepository.save(emptyBrand);

        String createBody = """
                {
                  "name":"ModelYeni",
                  "brandId":%d,
                  "deviceType":"LAPTOP",
                  "generalWarrantyMonths":24,
                  "partsWarrantyMonths":12,
                  "laborWarrantyMonths":12
                }
                """.formatted(emptyBrand.getId());

        MvcResult created = mockMvc.perform(post("/api/models")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("ModelYeni"))
                .andReturn();

        Integer id = JsonPath.read(created.getResponse().getContentAsString(), "$.id");

        String updateBody = """
                {
                  "name":"ModelGuncel",
                  "brandId":%d,
                  "deviceType":"LAPTOP",
                  "generalWarrantyMonths":36,
                  "partsWarrantyMonths":12,
                  "laborWarrantyMonths":12
                }
                """.formatted(emptyBrand.getId());

        mockMvc.perform(put("/api/models/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("ModelGuncel"));

        mockMvc.perform(delete("/api/models/" + id))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void model_MissingBrand_Returns404() throws Exception {
        String body = """
                {
                  "name":"X",
                  "brandId":999999,
                  "deviceType":"LAPTOP",
                  "generalWarrantyMonths":12,
                  "partsWarrantyMonths":12,
                  "laborWarrantyMonths":12
                }
                """;
        mockMvc.perform(post("/api/models")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void model_DuplicateUnderBrand_Returns409() throws Exception {
        String body = """
                {
                  "name":"P1-Model",
                  "brandId":%d,
                  "deviceType":"LAPTOP",
                  "generalWarrantyMonths":12,
                  "partsWarrantyMonths":12,
                  "laborWarrantyMonths":12
                }
                """.formatted(brand.getId());

        mockMvc.perform(post("/api/models")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value(containsString("aynı isimde")));
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void model_DeleteWithDevice_Returns409() throws Exception {
        Device device = new Device();
        device.setCustomer(customer);
        device.setModel(model);
        device.setSerialNumber("SN-P1-MODEL-DEL");
        deviceRepository.save(device);

        mockMvc.perform(delete("/api/models/" + model.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value(containsString("cihazlar")));
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void model_NegativeWarrantyMonths_Returns400() throws Exception {
        String body = """
                {
                  "name":"NegModel",
                  "brandId":%d,
                  "deviceType":"LAPTOP",
                  "generalWarrantyMonths":-1,
                  "partsWarrantyMonths":12,
                  "laborWarrantyMonths":12
                }
                """.formatted(brand.getId());

        mockMvc.perform(post("/api/models")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void warranty_GetBySerial_Succeeds() throws Exception {
        Device device = new Device();
        device.setCustomer(customer);
        device.setModel(model);
        device.setSerialNumber("SN-P1-WARRANTY");
        device.setPurchaseDate(LocalDate.of(2025, 1, 1));
        deviceRepository.save(device);

        mockMvc.perform(get("/api/warranty/device/SN-P1-WARRANTY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.serialNumber").value("SN-P1-WARRANTY"))
                .andExpect(jsonPath("$.brand").value(brand.getName()))
                .andExpect(jsonPath("$.model").value("P1-Model"))
                .andExpect(jsonPath("$.customerName").value("P1 Müşteri"))
                .andExpect(jsonPath("$.warrantyStatus").exists());
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void warranty_UnknownSerial_Returns404() throws Exception {
        mockMvc.perform(get("/api/warranty/device/UNKNOWN-SERIAL"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value(containsString("seri")));
    }

    @Test
    @WithMockUser(username = "admin@p1.test", authorities = "ROLE_ADMIN")
    void warranty_NullDate_ReturnsControlledStatus() throws Exception {
        Device device = new Device();
        device.setCustomer(customer);
        device.setModel(model);
        device.setSerialNumber("SN-P1-NO-DATE");
        deviceRepository.save(device);

        mockMvc.perform(get("/api/warranty/device/SN-P1-NO-DATE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.warrantyStatus").value("TARIH_EKSIK"));
    }
}
