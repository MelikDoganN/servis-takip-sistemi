package com.servis.backend.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * WhatsApp bot paylaşımlı API anahtarı doğrulaması (by-whatsapp + bot→backend çağrıları).
 */
@Component
public class BotApiKeyGuard {

    public static final String HEADER_NAME = "X-Bot-Api-Key";

    @Value("${whatsapp.bot.api-key:}")
    private String configuredApiKey;

    public boolean isConfigured() {
        return configuredApiKey != null && !configuredApiKey.isBlank();
    }

    public void requireValid(String providedKey) {
        if (!isConfigured()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Bot API anahtarı yapılandırılmamış"
            );
        }
        if (providedKey == null || providedKey.isBlank() || !constantTimeEquals(configuredApiKey, providedKey)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Geçersiz bot API anahtarı"
            );
        }
    }

    private static boolean constantTimeEquals(String expected, String actual) {
        byte[] a = expected.getBytes(StandardCharsets.UTF_8);
        byte[] b = actual.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(a, b);
    }
}
