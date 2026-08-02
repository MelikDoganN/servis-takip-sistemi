package com.servis.backend.service;

import com.servis.backend.dto.CreateCustomerRequest;
import com.servis.backend.dto.UpdateCustomerRequest;
import com.servis.backend.entity.Customer;
import com.servis.backend.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class CustomerService {

    @Autowired
    private CustomerRepository customerRepository;

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    public Customer getCustomerById(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Müşteri bulunamadı: " + id));
    }

    public Customer createCustomer(CreateCustomerRequest request) {
        Customer customer = new Customer();
        applyRequest(customer, request.getFullName(), request.getPhone(),
                request.getWhatsappNumber(), request.getEmail(), request.getAddress());
        return customerRepository.save(customer);
    }

    public Customer updateCustomer(Long id, UpdateCustomerRequest request) {
        Customer existing = getCustomerById(id);
        applyRequest(existing, request.getFullName(), request.getPhone(),
                request.getWhatsappNumber(), request.getEmail(), request.getAddress());
        return customerRepository.save(existing);
    }

    public void deleteCustomer(Long id) {
        if (!customerRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Müşteri bulunamadı: " + id);
        }
        customerRepository.deleteById(id);
    }

    public Customer findByWhatsappNumber(String whatsappNumber) {
        return customerRepository.findByWhatsappNumber(whatsappNumber)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Müşteri bulunamadı: " + whatsappNumber));
    }

    private void applyRequest(Customer customer, String fullName, String phone,
                              String whatsappNumber, String email, String address) {
        String trimmedName = requireNonBlank(fullName, "Ad soyad zorunludur");
        String trimmedPhone = requireNonBlank(phone, "Telefon zorunludur");

        customer.setFullName(trimmedName);
        customer.setPhone(trimmedPhone);
        customer.setWhatsappNumber(blankToNull(whatsappNumber));
        customer.setEmail(blankToNull(email));
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
