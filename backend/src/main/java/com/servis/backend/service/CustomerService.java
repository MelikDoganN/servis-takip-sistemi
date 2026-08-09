package com.servis.backend.service;

import com.servis.backend.audit.AuditActions;
import com.servis.backend.audit.AuditEntityTypes;
import com.servis.backend.audit.AuditEvent;
import com.servis.backend.audit.AuditSources;
import com.servis.backend.dto.CreateCustomerRequest;
import com.servis.backend.dto.UpdateCustomerRequest;
import com.servis.backend.entity.Customer;
import com.servis.backend.repository.CustomerRepository;
import com.servis.backend.repository.DeviceRepository;
import com.servis.backend.util.PhoneNormalizer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
public class CustomerService {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private AuditLogService auditLogService;

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    public Customer getCustomerById(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Müşteri bulunamadı: " + id));
    }

    public Customer createCustomer(CreateCustomerRequest request) {
        String phone = requireNonBlank(request.getPhone(), "Telefon zorunludur");
        String email = blankToNull(request.getEmail());
        assertPhoneAvailable(phone, null);
        assertEmailAvailable(email, null);

        Customer customer = new Customer();
        applyFields(customer, request.getFullName(), phone, request.getWhatsappNumber(), email, request.getAddress());
        Customer saved = customerRepository.save(customer);
        String display = saved.getFullName() != null ? saved.getFullName() : ("Müşteri#" + saved.getId());
        auditLogService.safeRecord(AuditEvent.of(AuditActions.CUSTOMER_CREATED)
                .actor(auditLogService.currentUserOrNull())
                .entity(AuditEntityTypes.CUSTOMER, saved.getId(), display)
                .description(display + " müşterisi oluşturuldu.")
                .source(AuditSources.WEB)
                .success(true)
                .meta("customerId", saved.getId())
                .meta("phone", saved.getPhone()));
        return saved;
    }

    public Customer updateCustomer(Long id, UpdateCustomerRequest request) {
        Customer existing = getCustomerById(id);
        String phone = requireNonBlank(request.getPhone(), "Telefon zorunludur");
        String email = blankToNull(request.getEmail());
        assertPhoneAvailable(phone, id);
        assertEmailAvailable(email, id);

        applyFields(existing, request.getFullName(), phone, request.getWhatsappNumber(), email, request.getAddress());
        Customer saved = customerRepository.save(existing);
        String display = saved.getFullName() != null ? saved.getFullName() : ("Müşteri#" + saved.getId());
        auditLogService.safeRecord(AuditEvent.of(AuditActions.CUSTOMER_UPDATED)
                .actor(auditLogService.currentUserOrNull())
                .entity(AuditEntityTypes.CUSTOMER, saved.getId(), display)
                .description(display + " müşterisi güncellendi.")
                .source(AuditSources.WEB)
                .success(true)
                .meta("customerId", saved.getId()));
        return saved;
    }

    public void deleteCustomer(Long id) {
        Customer existing = getCustomerById(id);
        if (deviceRepository.existsByCustomerId(id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bu müşteriye bağlı cihazlar bulunduğu için müşteri silinemez."
            );
        }
        String display = existing.getFullName() != null ? existing.getFullName() : ("Müşteri#" + id);
        customerRepository.deleteById(id);
        auditLogService.safeRecord(AuditEvent.of(AuditActions.CUSTOMER_DELETED)
                .actor(auditLogService.currentUserOrNull())
                .entity(AuditEntityTypes.CUSTOMER, id, display)
                .description(display + " müşterisi silindi.")
                .source(AuditSources.WEB)
                .success(true)
                .meta("customerId", id));
    }

    public Customer findByWhatsappNumber(String whatsappNumber) {
        return findByWhatsappNumberOptional(whatsappNumber)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Müşteri bulunamadı"));
    }

    /**
     * WhatsApp/telefon varyantlarıyla müşteri arar (canonical + ham formatlar).
     * DB kayıtlarını yeniden yazmaz.
     */
    public Optional<Customer> findByWhatsappNumberOptional(String whatsappNumber) {
        if (whatsappNumber == null || whatsappNumber.isBlank()) {
            return Optional.empty();
        }
        for (String variant : PhoneNormalizer.searchVariants(whatsappNumber)) {
            Optional<Customer> byWa = customerRepository.findByWhatsappNumber(variant);
            if (byWa.isPresent()) {
                return byWa;
            }
            Optional<Customer> byPhone = customerRepository.findByPhone(variant);
            if (byPhone.isPresent()) {
                return byPhone;
            }
        }
        return Optional.empty();
    }

    private void assertPhoneAvailable(String phone, Long excludeId) {
        boolean taken = excludeId == null
                ? customerRepository.existsByPhone(phone)
                : customerRepository.existsByPhoneAndIdNot(phone, excludeId);
        if (taken) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bu telefon numarasıyla kayıtlı bir müşteri zaten var."
            );
        }
    }

    private void assertEmailAvailable(String email, Long excludeId) {
        if (email == null) {
            return;
        }
        boolean taken = excludeId == null
                ? customerRepository.existsByEmailIgnoreCase(email)
                : customerRepository.existsByEmailIgnoreCaseAndIdNot(email, excludeId);
        if (taken) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bu e-posta adresiyle kayıtlı bir müşteri zaten var."
            );
        }
    }

    private void applyFields(Customer customer, String fullName, String phone,
                             String whatsappNumber, String email, String address) {
        customer.setFullName(requireNonBlank(fullName, "Ad soyad zorunludur"));
        customer.setPhone(phone);
        customer.setWhatsappNumber(blankToNull(whatsappNumber));
        customer.setEmail(email);
        customer.setAddress(blankToNull(address));
    }

    private static String requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
