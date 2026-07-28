package com.servis.backend.security;

/**
 * DB'de: ADMIN, TECHNICIAN, ...
 * Spring Security'de: ROLE_ADMIN, ROLE_TECHNICIAN, ...
 */
public final class RoleNames {

    private RoleNames() {
    }

    public static String toDbName(String role) {
        if (role == null || role.isBlank()) {
            return role;
        }
        String trimmed = role.trim();
        if (trimmed.startsWith("ROLE_")) {
            return trimmed.substring(5);
        }
        return trimmed;
    }

    public static String toAuthority(String dbRoleName) {
        if (dbRoleName == null || dbRoleName.isBlank()) {
            return dbRoleName;
        }
        String trimmed = dbRoleName.trim();
        if (trimmed.startsWith("ROLE_")) {
            return trimmed;
        }
        return "ROLE_" + trimmed;
    }
}
