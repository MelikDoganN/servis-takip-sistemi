package com.servis.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class AppConfig {

    @Value("${whatsapp.bot.connect-timeout-ms:2000}")
    private int connectTimeoutMs;

    @Value("${whatsapp.bot.read-timeout-ms:3000}")
    private int readTimeoutMs;

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofMillis(Math.max(connectTimeoutMs, 1)));
        factory.setReadTimeout(Duration.ofMillis(Math.max(readTimeoutMs, 1)));
        return new RestTemplate(factory);
    }
}
