package com.servis.backend.api;

import com.servis.backend.entity.Customer;
import com.servis.backend.entity.Role;
import com.servis.backend.entity.Technician;
import com.servis.backend.entity.User;
import com.servis.backend.repository.CustomerRepository;
import com.servis.backend.repository.RoleRepository;
import com.servis.backend.repository.TechnicianRepository;
import com.servis.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "whatsapp.bot.api-key=test-bot-api-key"
})
@Transactional
class BotLookupApiTest {

    private static final String API_KEY = "test-bot-api-key";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private TechnicianRepository technicianRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        Customer customer = new Customer();
        customer.setFullName("Bot Müşteri");
        customer.setPhone("5551002003");
        customer.setWhatsappNumber("905551002003");
        customer.setEmail("bot.customer@test.com");
        customer.setAddress("Gizli Adres 1");
        customerRepository.save(customer);

        Role techRole = roleRepository.findByName("TECHNICIAN").orElseGet(() -> {
            Role r = new Role();
            r.setName("TECHNICIAN");
            r.setDescription("Technician");
            return roleRepository.save(r);
        });

        User user = new User();
        user.setFullName("Bot Teknisyen");
        user.setEmail("bot.tech@test.com");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setPhone("5559998877");
        user.setIsActive(true);
        user.setRole(techRole);
        user = userRepository.save(user);

        Technician tech = new Technician();
        tech.setUser(user);
        tech.setWhatsappNumber("905559998877");
        tech.setIsAvailable(true);
        tech.setCurrentWorkload(0);
        technicianRepository.save(tech);
    }

    @Test
    void customerByWhatsapp_WithoutKey_Returns401() throws Exception {
        mockMvc.perform(get("/api/customers/by-whatsapp/905551002003"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void customerByWhatsapp_WrongKey_Returns401() throws Exception {
        mockMvc.perform(get("/api/customers/by-whatsapp/905551002003")
                        .header("X-Bot-Api-Key", "wrong-key"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void customerByWhatsapp_ValidKey_ReturnsNarrowDto() throws Exception {
        mockMvc.perform(get("/api/customers/by-whatsapp/905551002003")
                        .header("X-Bot-Api-Key", API_KEY)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Bot Müşteri"))
                .andExpect(jsonPath("$.whatsappNumber").value("905551002003"))
                .andExpect(jsonPath("$.phone").value("5551002003"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.address").doesNotExist());
    }

    @Test
    void technicianByWhatsapp_WithoutKey_Returns401() throws Exception {
        mockMvc.perform(get("/api/technicians/by-whatsapp/905559998877"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void technicianByWhatsapp_ValidKey_ReturnsNarrowDto() throws Exception {
        String body = mockMvc.perform(get("/api/technicians/by-whatsapp/905559998877")
                        .header("X-Bot-Api-Key", API_KEY)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Bot Teknisyen"))
                .andExpect(jsonPath("$.whatsappNumber").value("905559998877"))
                .andExpect(jsonPath("$.isAvailable").value(true))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.user").doesNotExist())
                .andReturn()
                .getResponse()
                .getContentAsString();

        org.hamcrest.MatcherAssert.assertThat(body, not(containsString("password")));
        org.hamcrest.MatcherAssert.assertThat(body, not(containsString("bot.tech@test.com")));
    }
}
