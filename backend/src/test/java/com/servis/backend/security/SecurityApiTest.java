package com.servis.backend.security;

import com.servis.backend.entity.Region;
import com.servis.backend.entity.Role;
import com.servis.backend.entity.User;
import com.servis.backend.repository.RegionRepository;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SecurityApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RegionRepository regionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private Region testRegion;

    @BeforeEach
    void setUp() {
        Role adminRole = roleRepository.findByName("ADMIN").orElseGet(() -> {
            Role r = new Role();
            r.setName("ADMIN");
            r.setDescription("Admin");
            return roleRepository.save(r);
        });
        Role technicianRole = roleRepository.findByName("TECHNICIAN").orElseGet(() -> {
            Role r = new Role();
            r.setName("TECHNICIAN");
            r.setDescription("Technician");
            return roleRepository.save(r);
        });

        if (userRepository.findByEmail("admin@test.com").isEmpty()) {
            User u = new User();
            u.setFullName("Admin User");
            u.setEmail("admin@test.com");
            u.setPasswordHash(passwordEncoder.encode("password123"));
            u.setIsActive(true);
            u.setRole(adminRole);
            userRepository.save(u);
        }

        if (userRepository.findByEmail("tech@test.com").isEmpty()) {
            User u = new User();
            u.setFullName("Tech User");
            u.setEmail("tech@test.com");
            u.setPasswordHash(passwordEncoder.encode("password123"));
            u.setIsActive(true);
            u.setRole(technicianRole);
            userRepository.save(u);
        }

        if (userRepository.findByEmail("inactive@test.com").isEmpty()) {
            User u = new User();
            u.setFullName("Inactive User");
            u.setEmail("inactive@test.com");
            u.setPasswordHash(passwordEncoder.encode("password123"));
            u.setIsActive(false);
            u.setRole(adminRole);
            userRepository.save(u);
        }

        testRegion = regionRepository.findAll().stream().findFirst().orElseGet(() -> {
            Region region = new Region();
            region.setName("Test Bölge");
            return regionRepository.save(region);
        });
    }

    @Test
    void login_TokenContainsRolesClaim() throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@test.com","password":"password123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andReturn();

        String response = result.getResponse().getContentAsString();
        String token = response.replaceAll("(?s).*\"token\"\\s*:\\s*\"([^\"]+)\".*", "$1");
        @SuppressWarnings("unchecked")
        List<String> roles = jwtService.extractClaim(token, claims -> (List<String>) claims.get("roles"));
        assertTrue(roles.contains("ROLE_ADMIN"), "Expected ROLE_ADMIN in roles claim, got: " + roles);
        assertEquals("admin@test.com", jwtService.extractUsername(token));
    }

    @Test
    void register_WhenUsersExist_Returns403() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Another Admin","email":"another@test.com","password":"password123"}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void customers_WithoutJwt_Returns401() throws Exception {
        mockMvc.perform(get("/api/customers")).andExpect(status().isUnauthorized());
    }

    @Test
    void devices_WithoutJwt_Returns401() throws Exception {
        mockMvc.perform(get("/api/devices")).andExpect(status().isUnauthorized());
    }

    @Test
    void warranty_WithoutJwt_Returns401() throws Exception {
        mockMvc.perform(get("/api/warranty/check/1/PARTS")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "admin@test.com", authorities = "ROLE_ADMIN")
    void admin_CanCreateTechnician() throws Exception {
        String body = """
                {
                  "fullName":"Yeni Teknisyen",
                  "email":"yeni.tech@test.com",
                  "password":"secret1",
                  "whatsappNumber":"5550001111",
                  "regionId":%d
                }
                """.formatted(testRegion.getId());

        mockMvc.perform(post("/api/technicians")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.whatsappNumber").value("5550001111"));
    }

    @Test
    @WithMockUser(username = "tech@test.com", authorities = "ROLE_TECHNICIAN")
    void technician_CannotCreateTechnician_Returns403() throws Exception {
        String body = """
                {
                  "fullName":"Yetkisiz",
                  "email":"yetkisiz@test.com",
                  "password":"secret1",
                  "whatsappNumber":"5550002222",
                  "regionId":%d
                }
                """.formatted(testRegion.getId());

        mockMvc.perform(post("/api/technicians")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin@test.com", authorities = "ROLE_ADMIN")
    void createTechnician_MissingRegionId_Returns400() throws Exception {
        mockMvc.perform(post("/api/technicians")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Eksik Bolge",
                                  "email":"eksik.bolge@test.com",
                                  "password":"secret1",
                                  "whatsappNumber":"5550003333"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.regionId").exists());
    }

    @Test
    @WithMockUser(username = "admin@test.com", authorities = "ROLE_ADMIN")
    void createTechnician_MissingWhatsapp_Returns400() throws Exception {
        String body = """
                {
                  "fullName":"Eksik Whatsapp",
                  "email":"eksik.wa@test.com",
                  "password":"secret1",
                  "regionId":%d,
                  "whatsappNumber":""
                }
                """.formatted(testRegion.getId());

        mockMvc.perform(post("/api/technicians")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.whatsappNumber").exists());
    }

    @Test
    void inactiveUser_CannotLogin() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"inactive@test.com","password":"password123"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "admin@test.com", authorities = "ROLE_ADMIN")
    void admin_CanAccessUserManagement() throws Exception {
        mockMvc.perform(get("/api/users")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "tech@test.com", authorities = "ROLE_TECHNICIAN")
    void technician_CannotAccessAdminEndpoints() throws Exception {
        mockMvc.perform(get("/api/users")).andExpect(status().isForbidden());
    }
}
