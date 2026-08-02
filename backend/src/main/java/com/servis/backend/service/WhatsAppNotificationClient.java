package com.servis.backend.service;

import com.servis.backend.security.BotApiKeyGuard;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Backend → WhatsApp bot /send-notification istemcisi.
 * URL veya API key yoksa çağrıyı atlar; iş emri create'ini bozmaz.
 */
@Service
public class WhatsAppNotificationClient {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppNotificationClient.class);

    @Autowired
    private RestTemplate restTemplate;

    @Value("${whatsapp.bot.url:}")
    private String botBaseUrl;

    @Value("${whatsapp.bot.api-key:}")
    private String botApiKey;

    public void sendNotification(String phone, String message) {
        if (botBaseUrl == null || botBaseUrl.isBlank()) {
            log.warn("WhatsApp bildirimi atlandı: WHATSAPP_BOT_URL tanımlı değil");
            return;
        }
        if (botApiKey == null || botApiKey.isBlank()) {
            log.warn("WhatsApp bildirimi atlandı: WHATSAPP_BOT_API_KEY tanımlı değil");
            return;
        }
        if (phone == null || phone.isBlank() || message == null || message.isBlank()) {
            log.warn("WhatsApp bildirimi atlandı: telefon veya mesaj boş");
            return;
        }

        String url = joinUrl(botBaseUrl.trim(), "/send-notification");
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set(BotApiKeyGuard.HEADER_NAME, botApiKey);
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(
                    Map.of("phone", phone, "message", message),
                    headers
            );
            restTemplate.postForEntity(url, entity, String.class);
            log.info("WhatsApp bildirimi gönderildi: phone={}", maskPhone(phone));
        } catch (Exception e) {
            log.warn("WhatsApp bildirimi gönderilemedi: phone={}, reason={}",
                    maskPhone(phone), e.getClass().getSimpleName());
        }
    }

    static String joinUrl(String base, String path) {
        String b = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        String p = path.startsWith("/") ? path : "/" + path;
        return b + p;
    }

    static String maskPhone(String phone) {
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() <= 6) {
            return "***";
        }
        return digits.substring(0, 3) + "******" + digits.substring(digits.length() - 3);
    }
}
