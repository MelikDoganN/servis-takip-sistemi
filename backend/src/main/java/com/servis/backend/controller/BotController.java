package com.servis.backend.controller;

import com.servis.backend.dto.BotInteractionRequest;
import com.servis.backend.security.BotApiKeyGuard;
import com.servis.backend.service.BotInteractionLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * WhatsApp bot yardımcı endpoint'leri — X-Bot-Api-Key zorunlu.
 */
@RestController
@RequestMapping("/api/bot")
public class BotController {

    @Autowired
    private BotApiKeyGuard botApiKeyGuard;

    @Autowired
    private BotInteractionLogService botInteractionLogService;

    /**
     * Meta message id idempotency claim.
     * Duplicate ise {@code duplicate:true} ile 200 döner (webhook tekrar işlenmesin).
     */
    @PostMapping("/inbound-claim")
    public ResponseEntity<?> claimInbound(
            @RequestHeader(value = BotApiKeyGuard.HEADER_NAME, required = false) String botApiKey,
            @RequestBody BotInteractionRequest request) {
        botApiKeyGuard.requireValid(botApiKey);
        boolean claimed = botInteractionLogService.claimInboundMessage(
                request.getExternalMessageId(),
                request.getPhone(),
                request.getMessageType(),
                request.getCommand()
        );
        if (!claimed) {
            return ResponseEntity.ok(Map.of("duplicate", true, "status", "skipped"));
        }
        return ResponseEntity.ok(Map.of("duplicate", false, "status", "claimed"));
    }

    @PostMapping("/interactions")
    public ResponseEntity<?> logInteraction(
            @RequestHeader(value = BotApiKeyGuard.HEADER_NAME, required = false) String botApiKey,
            @RequestBody BotInteractionRequest request) {
        botApiKeyGuard.requireValid(botApiKey);
        botInteractionLogService.logSafely(request);
        return ResponseEntity.ok(Map.of("status", "logged"));
    }
}
