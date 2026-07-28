package com.servis.backend.security;

import com.servis.backend.entity.Technician;
import com.servis.backend.entity.User;
import com.servis.backend.entity.WorkOrder;
import com.servis.backend.repository.TechnicianRepository;
import com.servis.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class WorkOrderAccessGuard {

    @Autowired
    private UserService userService;

    @Autowired
    private TechnicianRepository technicianRepository;

    public User requireCurrentUser(UserDetails userDetails) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Kimlik doğrulama gerekli");
        }
        return userService.findByEmail(userDetails.getUsername());
    }

    public void assertCanModify(WorkOrder workOrder, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Kimlik doğrulama gerekli");
        }

        if (hasAnyRole(authentication, "ROLE_ADMIN", "ROLE_REGION_MANAGER", "ROLE_CENTER_OPERATOR")) {
            return;
        }

        if (hasRole(authentication, "ROLE_TECHNICIAN")) {
            User current = userService.findByEmail(authentication.getName());
            Technician tech = technicianRepository.findByUserId(current.getId()).orElse(null);
            if (tech != null
                    && workOrder.getTechnician() != null
                    && tech.getId().equals(workOrder.getTechnician().getId())) {
                return;
            }
            throw new AccessDeniedException("Bu iş emrine müdahale yetkiniz yok");
        }

        throw new AccessDeniedException("Bu iş emrine müdahale yetkiniz yok");
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role::equals);
    }

    private boolean hasAnyRole(Authentication authentication, String... roles) {
        for (String role : roles) {
            if (hasRole(authentication, role)) {
                return true;
            }
        }
        return false;
    }
}
