package com.servis.backend.controller;

import com.servis.backend.dto.BotHealthDto;
import com.servis.backend.dto.BotInteractionLogDto;
import com.servis.backend.dto.BotInteractionRequest;
import com.servis.backend.security.BotApiKeyGuard;
import com.servis.backend.service.BotHealthService;
import com.servis.backend.service.BotInteractionLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * WhatsApp bot yardımcı endpoint'leri.
 * POST inbound-claim / interactions → X-Bot-Api-Key.
 * GET health / interactions → ADMIN JWT.
 */
@RestController
@RequestMapping("/api/bot")
public class BotController {

    @Autowired
    private BotApiKeyGuard botApiKeyGuard;

    @Autowired
    private BotInteractionLogService botInteractionLogService;

    @Autowired
    private BotHealthService botHealthService;

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

    @GetMapping("/health")
    @PreAuthorize("hasRole('ADMIN')")
    public BotHealthDto health() {
        return botHealthService.getHealth();
    }

    @GetMapping("/interactions")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<BotInteractionLogDto> listInteractions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String direction,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String eventType) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return botInteractionLogService.list(direction, status, eventType, pageable);
    }

    @GetMapping("/interactions/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public BotInteractionLogDto getInteraction(@PathVariable Long id) {
        return botInteractionLogService.getById(id);
    }
}
