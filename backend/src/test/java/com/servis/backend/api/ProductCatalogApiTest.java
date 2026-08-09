package com.servis.backend.api;

import com.servis.backend.entity.Customer;
import com.servis.backend.entity.Device;
import com.servis.backend.entity.DeviceModel;
import com.servis.backend.entity.Product;
import com.servis.backend.entity.ProductCategory;
import com.servis.backend.entity.Role;
import com.servis.backend.entity.User;
import com.servis.backend.repository.BrandRepository;
import com.servis.backend.repository.CustomerRepository;
import com.servis.backend.repository.DeviceModelRepository;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.repository.ProductCategoryRepository;
import com.servis.backend.repository.ProductRepository;
import com.servis.backend.repository.RoleRepository;
import com.servis.backend.repository.UserRepository;
import com.servis.backend.entity.Brand;
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

import java.math.BigDecimal;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ProductCatalogApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductCategoryRepository categoryRepository;

    @Autowired
    private BrandRepository brandRepository;

    @Autowired
    private DeviceModelRepository deviceModelRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    private ProductCategory climateCat;

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
            r.setDescription("Tech");
            return roleRepository.save(r);
        });
        if (userRepository.findByEmail("catalog.admin@test.com").isEmpty()) {
            User u = new User();
            u.setFullName("Catalog Admin");
            u.setEmail("catalog.admin@test.com");
            u.setPasswordHash(passwordEncoder.encode("password123"));
            u.setIsActive(true);
            u.setRole(adminRole);
            userRepository.save(u);
        }

        climateCat = categoryRepository.findBySlug("iklimlendirme").orElseGet(() -> {
            ProductCategory c = new ProductCategory();
            c.setName("İklimlendirme");
            c.setSlug("iklimlendirme");
            c.setActive(true);
            c.setSortOrder(1);
            return categoryRepository.save(c);
        });

        productRepository.deleteAll();

        Product active = new Product();
        active.setName("Split Klima Pro");
        active.setSlug("split-klima-pro");
        active.setBrand("DemoBrand");
        active.setModel("SK-12000");
        active.setCategory(climateCat);
        active.setShortDescription("Tanıtım ürünü");
        active.setPrice(new BigDecimal("18999.00"));
        active.setCurrency("TRY");
        active.setActive(true);
        active.setFeatured(true);
        active.setStockStatus("AVAILABLE");
        productRepository.save(active);

        Product inactive = new Product();
        inactive.setName("Gizli Ürün");
        inactive.setSlug("gizli-urun");
        inactive.setBrand("DemoBrand");
        inactive.setActive(false);
        inactive.setFeatured(true);
        inactive.setCurrency("TRY");
        inactive.setStockStatus("AVAILABLE");
        productRepository.save(inactive);

        // Müşteri cihazı — public'e sızmamalı
        Brand brand = brandRepository.findAll().stream().findFirst().orElseGet(() -> {
            Brand b = new Brand();
            b.setName("ServisMarka");
            b.setIsActive(true);
            return brandRepository.save(b);
        });
        DeviceModel model = deviceModelRepository.findAll().stream().findFirst().orElseGet(() -> {
            DeviceModel m = new DeviceModel();
            m.setBrand(brand);
            m.setName("ServisModel");
            m.setIsActive(true);
            return deviceModelRepository.save(m);
        });
        Customer customer = customerRepository.findAll().stream().findFirst().orElseGet(() -> {
            Customer c = new Customer();
            c.setFullName("Gizli Müşteri");
            c.setPhone("5559998877");
            return customerRepository.save(c);
        });
        if (deviceRepository.findBySerialNumber("CUST-SN-SECRET").isEmpty()) {
            Device device = new Device();
            device.setCustomer(customer);
            device.setModel(model);
            device.setSerialNumber("CUST-SN-SECRET");
            deviceRepository.save(device);
        }
    }

    @Test
    void public_ListsOnlyActiveProducts() throws Exception {
        mockMvc.perform(get("/api/public/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].slug", hasItem("split-klima-pro")))
                .andExpect(jsonPath("$.content[*].slug", not(hasItem("gizli-urun"))))
                .andExpect(jsonPath("$.content[*].slug", not(hasItem(containsString("CUST")))))
                .andExpect(jsonPath("$.content[0].name").exists());
    }

    @Test
    void public_InactiveSlug_Returns404() throws Exception {
        mockMvc.perform(get("/api/public/products/gizli-urun"))
                .andExpect(status().isNotFound());
    }

    @Test
    void public_SlugLookup_Ok() throws Exception {
        mockMvc.perform(get("/api/public/products/split-klima-pro"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("split-klima-pro"))
                .andExpect(jsonPath("$.brand").value("DemoBrand"))
                .andExpect(jsonPath("$.categorySlug").value("iklimlendirme"));
    }

    @Test
    void public_Featured_OnlyActiveFeatured() throws Exception {
        mockMvc.perform(get("/api/public/products/featured"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].slug", hasItem("split-klima-pro")))
                .andExpect(jsonPath("$[*].slug", not(hasItem("gizli-urun"))));
    }

    @Test
    void public_SearchAndCategoryAndPagination() throws Exception {
        mockMvc.perform(get("/api/public/products")
                        .param("search", "Klima")
                        .param("category", "iklimlendirme")
                        .param("brand", "DemoBrand")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.size").value(10))
                .andExpect(jsonPath("$.content[0].name", containsString("Klima")));
    }

    @Test
    void public_Categories_Ok() throws Exception {
        mockMvc.perform(get("/api/public/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].slug", hasItem("iklimlendirme")));
    }

    @Test
    void public_DoesNotExposeCustomerDeviceSerial() throws Exception {
        String body = mockMvc.perform(get("/api/public/products"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        org.junit.jupiter.api.Assertions.assertFalse(body.contains("CUST-SN-SECRET"));
        org.junit.jupiter.api.Assertions.assertFalse(body.contains("Gizli Müşteri"));
    }

    @Test
    @WithMockUser(username = "catalog.admin@test.com", authorities = "ROLE_ADMIN")
    void admin_CanCreateUpdateAndSoftDisable() throws Exception {
        String created = mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"Kombi Eco",
                                  "brand":"DemoBrand",
                                  "categoryId":%d,
                                  "price":12500,
                                  "featured":false,
                                  "active":true,
                                  "stockStatus":"AVAILABLE"
                                }
                                """.formatted(climateCat.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slug").value("kombi-eco"))
                .andExpect(jsonPath("$.active").value(true))
                .andReturn()
                .getResponse()
                .getContentAsString();

        Long id = Long.parseLong(created.replaceAll("(?s).*\"id\"\\s*:\\s*(\\d+).*", "$1"));

        mockMvc.perform(put("/api/products/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"Kombi Eco Plus",
                                  "slug":"kombi-eco",
                                  "brand":"DemoBrand",
                                  "categoryId":%d,
                                  "price":13500,
                                  "active":true,
                                  "featured":true,
                                  "stockStatus":"LIMITED"
                                }
                                """.formatted(climateCat.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Kombi Eco Plus"))
                .andExpect(jsonPath("$.stockStatus").value("LIMITED"));

        mockMvc.perform(delete("/api/products/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(get("/api/public/products/kombi-eco"))
                .andExpect(status().isNotFound());
    }

    @Test
    void unauthenticated_CannotWriteProducts() throws Exception {
        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Yetkisiz","active":true}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "tech@test.com", authorities = "ROLE_TECHNICIAN")
    void technician_CannotWriteProducts() throws Exception {
        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"TeknisyenUrun","active":true}
                                """))
                .andExpect(status().isForbidden());
    }
}
