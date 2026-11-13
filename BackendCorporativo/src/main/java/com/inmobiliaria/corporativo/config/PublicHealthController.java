package com.inmobiliaria.corporativo.config;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class PublicHealthController {

    @GetMapping("/api/corp/public/health")
    public Map<String, Object> health() {
        return Map.of("status", "ok", "servicio", "backend-corporativo");
    }
}
