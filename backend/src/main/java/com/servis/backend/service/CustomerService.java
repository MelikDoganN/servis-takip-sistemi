package com.servis.backend.service;

import com.servis.backend.entity.Customer;
import com.servis.backend.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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
                .orElseThrow(() -> new RuntimeException("Müşteri bulunamadı: " + id));
    }

    public Customer createCustomer(Customer customer) {
        return customerRepository.save(customer);
    }

    public Customer updateCustomer(Long id, Customer customerDetails) {
        Customer existing = getCustomerById(id);
        existing.setFullName(customerDetails.getFullName());
        existing.setPhone(customerDetails.getPhone());
        existing.setWhatsappNumber(customerDetails.getWhatsappNumber());
        existing.setEmail(customerDetails.getEmail());
        existing.setAddress(customerDetails.getAddress());
        return customerRepository.save(existing);
    }

    public void deleteCustomer(Long id) {
        customerRepository.deleteById(id);
    }
}