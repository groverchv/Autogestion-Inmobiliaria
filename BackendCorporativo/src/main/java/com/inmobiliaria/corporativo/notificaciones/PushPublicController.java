package com.inmobiliaria.corporativo.notificaciones;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/corp/public/push")
public class PushPublicController {

    public record SubscriptionKeys(String p256dh, String auth) {}
    public record SubscribeRequest(
            @NotBlank String endpoint,
            @NotBlank SubscriptionKeys keys,
            String userAgent) {}
    public record UnsubscribeRequest(@NotBlank String endpoint) {}

    private final PushService pushService;

    public PushPublicController(PushService pushService) {
        this.pushService = pushService;
    }

    @GetMapping("/vapid-key")
    public Map<String, String> vapidKey() {
        return Map.of("publicKey", pushService.getVapidPublicKey());
    }

    @PostMapping("/suscripciones")
    public ResponseEntity<Map<String, Object>> suscribir(@Valid @RequestBody SubscribeRequest req) {
        pushService.suscribir(req.endpoint(), req.keys().p256dh(), req.keys().auth(), req.userAgent());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("ok", true));
    }

    @DeleteMapping("/suscripciones")
    public ResponseEntity<Map<String, Object>> desuscribir(@Valid @RequestBody UnsubscribeRequest req) {
        pushService.desuscribir(req.endpoint());
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
