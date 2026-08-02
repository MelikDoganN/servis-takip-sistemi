package com.servis.backend.controller;

import com.servis.backend.dto.BotCustomerLookupDto;
import com.servis.backend.dto.CreateCustomerRequest;
import com.servis.backend.dto.UpdateCustomerRequest;
import com.servis.backend.entity.Customer;
import com.servis.backend.security.BotApiKeyGuard;
import com.servis.backend.service.CustomerService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private BotApiKeyGuard botApiKeyGuard;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CENTER_OPERATOR', 'REGION_MANAGER', 'TECHNICIAN')")
    public List<Customer> getAllCustomers() {
        return customerService.getAllCustomers();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CENTER_OPERATOR', 'REGION_MANAGER', 'TECHNICIAN')")
    public ResponseEntity<Customer> getCustomerById(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getCustomerById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CENTER_OPERATOR', 'REGION_MANAGER')")
    public ResponseEntity<Customer> createCustomer(@Valid @RequestBody CreateCustomerRequest request) {
        return new ResponseEntity<>(customerService.createCustomer(request), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CENTER_OPERATOR', 'REGION_MANAGER')")
    public ResponseEntity<Customer> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody UpdateCustomerRequest request) {
        return ResponseEntity.ok(customerService.updateCustomer(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCustomer(@PathVariable Long id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * WhatsApp bot lookup — SecurityConfig permitAll; X-Bot-Api-Key zorunlu.
     * Dar DTO döner (email/address yok).
     */
    @GetMapping("/by-whatsapp/{whatsappNumber}")
    public ResponseEntity<?> getCustomerByWhatsapp(
            @PathVariable String whatsappNumber,
            @RequestHeader(value = BotApiKeyGuard.HEADER_NAME, required = false) String botApiKey) {
        botApiKeyGuard.requireValid(botApiKey);
        try {
            Customer customer = customerService.findByWhatsappNumber(whatsappNumber);
            return ResponseEntity.ok(new BotCustomerLookupDto(
                    customer.getId(),
                    customer.getFullName(),
                    customer.getWhatsappNumber(),
                    customer.getPhone()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Müşteri bulunamadı"));
        }
    }
}
