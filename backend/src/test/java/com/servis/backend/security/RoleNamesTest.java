package com.servis.backend.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RoleNamesTest {

    @Test
    void toDbName_StripsRolePrefix() {
        assertEquals("ADMIN", RoleNames.toDbName("ROLE_ADMIN"));
        assertEquals("ADMIN", RoleNames.toDbName("ADMIN"));
        assertEquals("TECHNICIAN", RoleNames.toDbName("ROLE_TECHNICIAN"));
    }

    @Test
    void toAuthority_AddsRolePrefixOnce() {
        assertEquals("ROLE_ADMIN", RoleNames.toAuthority("ADMIN"));
        assertEquals("ROLE_ADMIN", RoleNames.toAuthority("ROLE_ADMIN"));
        assertEquals("ROLE_TECHNICIAN", RoleNames.toAuthority("TECHNICIAN"));
    }
}
