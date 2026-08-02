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

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class WorkOrderRelationApiTest {

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

    private Customer customerA;
    private Customer customerB;
    private Device deviceOfA;
    private DeviceModel model;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName("ADMIN").orElseGet(() -> {
            Role r = new Role();
            r.setName("ADMIN");
            r.setDescription("Admin");
            return roleRepository.save(r);
        });

        if (userRepository.findByEmail("admin@wo.test").isEmpty()) {
            User u = new User();
            u.setFullName("WO Admin");
            u.setEmail("admin@wo.test");
            u.setPasswordHash(passwordEncoder.encode("password123"));
            u.setIsActive(true);
            u.setRole(adminRole);
            userRepository.save(u);
        }

        Brand brand = new Brand();
        brand.setName("WO-Brand-" + System.nanoTime());
        brand.setIsActive(true);
        brand = brandRepository.save(brand);

        model = new DeviceModel();
        model.setBrand(brand);
        model.setName("WO-Model");
        model.setDeviceType("BEYAZ_ESYA");
        model.setGeneralWarrantyMonths(12);
        model.setPartsWarrantyMonths(12);
        model.setLaborWarrantyMonths(12);
        model.setIsActive(true);
        model = deviceModelRepository.save(model);

        customerA = new Customer();
        customerA.setFullName("Müşteri A");
        customerA.setPhone("5551000001");
        customerA = customerRepository.save(customerA);

        customerB = new Customer();
        customerB.setFullName("Müşteri B");
        customerB.setPhone("5551000002");
        customerB = customerRepository.save(customerB);

        deviceOfA = new Device();
        deviceOfA.setCustomer(customerA);
        deviceOfA.setModel(model);
        deviceOfA.setSerialNumber("SN-WO-A-" + System.nanoTime());
        deviceOfA = deviceRepository.save(deviceOfA);
    }

    @Test
    @WithMockUser(username = "admin@wo.test", authorities = "ROLE_ADMIN")
    void workOrder_MismatchedCustomerDevice_Returns400() throws Exception {
        String body = """
                {
                  "customer":{"id":%d},
                  "device":{"id":%d},
                  "description":"Yanlış eşleşme",
                  "priority":"MEDIUM",
                  "serviceType":"PAID"
                }
                """.formatted(customerB.getId(), deviceOfA.getId());

        mockMvc.perform(post("/api/workorders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("ait değildir")));
    }

    @Test
    @WithMockUser(username = "admin@wo.test", authorities = "ROLE_ADMIN")
    void workOrder_ValidCustomerDevice_Returns201() throws Exception {
        String body = """
                {
                  "customer":{"id":%d},
                  "device":{"id":%d},
                  "description":"Doğru eşleşme",
                  "priority":"HIGH",
                  "serviceType":"WARRANTY"
                }
                """.formatted(customerA.getId(), deviceOfA.getId());

        mockMvc.perform(post("/api/workorders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.serviceNumber").exists())
                .andExpect(jsonPath("$.customer.id").value(customerA.getId().intValue()))
                .andExpect(jsonPath("$.device.id").value(deviceOfA.getId().intValue()));
    }

    @Test
    @WithMockUser(username = "admin@wo.test", authorities = "ROLE_ADMIN")
    void workOrder_MissingCustomer_Returns404() throws Exception {
        String body = """
                {
                  "customer":{"id":999999},
                  "device":{"id":%d},
                  "description":"Yok müşteri",
                  "priority":"LOW",
                  "serviceType":"PAID"
                }
                """.formatted(deviceOfA.getId());

        mockMvc.perform(post("/api/workorders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value(containsString("Müşteri")));
    }

    @Test
    @WithMockUser(username = "admin@wo.test", authorities = "ROLE_ADMIN")
    void workOrder_MissingDevice_Returns404() throws Exception {
        String body = """
                {
                  "customer":{"id":%d},
                  "device":{"id":999999},
                  "description":"Yok cihaz",
                  "priority":"LOW",
                  "serviceType":"PAID"
                }
                """.formatted(customerA.getId());

        mockMvc.perform(post("/api/workorders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value(containsString("Cihaz")));
    }

    @Test
    @WithMockUser(username = "admin@wo.test", authorities = "ROLE_ADMIN")
    void workOrder_MissingTechnician_Returns404() throws Exception {
        String body = """
                {
                  "customer":{"id":%d},
                  "device":{"id":%d},
                  "technician":{"id":999999},
                  "description":"Yok teknisyen",
                  "priority":"LOW",
                  "serviceType":"PAID"
                }
                """.formatted(customerA.getId(), deviceOfA.getId());

        mockMvc.perform(post("/api/workorders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value(containsString("Teknisyen")));
    }
}
