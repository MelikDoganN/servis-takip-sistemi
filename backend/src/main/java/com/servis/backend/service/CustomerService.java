package com.servis.backend.service;

import com.servis.backend.dto.CreateCustomerRequest;
import com.servis.backend.dto.UpdateCustomerRequest;
import com.servis.backend.entity.Customer;
import com.servis.backend.repository.CustomerRepository;
import com.servis.backend.repository.DeviceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class CustomerService {

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private DeviceRepository deviceRepository;

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
        return customerRepository.save(customer);
    }

    public Customer updateCustomer(Long id, UpdateCustomerRequest request) {
        Customer existing = getCustomerById(id);
        String phone = requireNonBlank(request.getPhone(), "Telefon zorunludur");
        String email = blankToNull(request.getEmail());
        assertPhoneAvailable(phone, id);
        assertEmailAvailable(email, id);

        applyFields(existing, request.getFullName(), phone, request.getWhatsappNumber(), email, request.getAddress());
        return customerRepository.save(existing);
    }

    public void deleteCustomer(Long id) {
        if (!customerRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Müşteri bulunamadı: " + id);
        }
        if (deviceRepository.existsByCustomerId(id)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Bu müşteriye bağlı cihazlar bulunduğu için müşteri silinemez."
            );
        }
        customerRepository.deleteById(id);
    }

    public Customer findByWhatsappNumber(String whatsappNumber) {
        return customerRepository.findByWhatsappNumber(whatsappNumber)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Müşteri bulunamadı: " + whatsappNumber));
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
