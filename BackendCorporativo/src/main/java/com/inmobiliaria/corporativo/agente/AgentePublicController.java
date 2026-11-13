package com.inmobiliaria.corporativo.agente;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Chat del asistente virtual corporativo (público, con rate limit por IP
 * igual que los demás POST públicos).
 */
@RestController
@RequestMapping("/api/corp/public")
public class AgentePublicController {

    public record MensajeDto(
            @NotBlank @Size(max = 10) String rol,
            @NotBlank @Size(max = 1500) String texto) {}

    public record AgenteRequest(
            @NotBlank @Size(max = 1000) String mensaje,
            @Size(max = 8) List<MensajeDto> historial) {}

    private final AgenteService agente;

    public AgentePublicController(AgenteService agente) {
        this.agente = agente;
    }

    @PostMapping("/agente")
    public ResponseEntity<Map<String, Object>> chat(@Valid @RequestBody AgenteRequest req) {
        if (!agente.habilitado()) {
            return ResponseEntity.ok(Map.of(
                    "ok", false,
                    "texto", "El asistente no está disponible ahora. Escríbenos por WhatsApp o usa el formulario de contacto.",
                    "sugerencias", List.of()));
        }
        var historial = req.historial() == null ? List.<AgenteService.Mensaje>of()
                : req.historial().stream()
                        .map(m -> new AgenteService.Mensaje(m.rol(), m.texto()))
                        .toList();
        var r = agente.responder(req.mensaje().trim(), historial);
        return ResponseEntity.ok(Map.of(
                "ok", true,
                "texto", r.texto(),
                "sugerencias", r.sugerencias(),
                "accion", r.accion()));
    }
}
