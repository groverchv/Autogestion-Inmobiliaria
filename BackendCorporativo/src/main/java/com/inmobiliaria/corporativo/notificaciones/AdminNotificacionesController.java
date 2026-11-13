package com.inmobiliaria.corporativo.notificaciones;

import com.inmobiliaria.corporativo.leads.SuscriptorNewsletter;
import com.inmobiliaria.corporativo.leads.SuscriptorNewsletterRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/corp/admin")
public class AdminNotificacionesController {

    public record DifusionPushRequest(
            @NotBlank @Size(max = 100) String titulo,
            @Size(max = 300) String cuerpo,
            @Size(max = 300) String url) {}

    public record DifusionNewsletterRequest(
            @NotBlank @Size(max = 250) String asunto,
            @NotBlank String contenidoHtml) {}

    private final PushService pushService;
    private final EmailService emailService;
    private final SuscriptorNewsletterRepository suscriptores;
    private final EmailLogRepository emailLog;

    public AdminNotificacionesController(PushService pushService, EmailService emailService,
                                         SuscriptorNewsletterRepository suscriptores,
                                         EmailLogRepository emailLog) {
        this.pushService = pushService;
        this.emailService = emailService;
        this.suscriptores = suscriptores;
        this.emailLog = emailLog;
    }

    // ─── Push ────────────────────────────────────────────────────
    @GetMapping("/push/stats")
    public Map<String, Object> pushStats() {
        return Map.of("suscriptores_activos", pushService.contarActivos());
    }

    @PostMapping("/push/difundir")
    public Map<String, Object> difundirPush(@Valid @RequestBody DifusionPushRequest req) {
        pushService.difundir(req.titulo(), req.cuerpo(), req.url());
        return Map.of(
                "ok", true,
                "destinatarios", pushService.contarActivos(),
                "mensaje", "Difusión en curso");
    }

    // ─── Newsletter ──────────────────────────────────────────────
    @GetMapping("/newsletter/suscriptores")
    public List<SuscriptorNewsletter> suscriptores() {
        return suscriptores.findAll();
    }

    @DeleteMapping("/newsletter/suscriptores/{id}")
    public ResponseEntity<Void> eliminarSuscriptor(@PathVariable Long id) {
        suscriptores.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/newsletter/difundir")
    public Map<String, Object> difundirNewsletter(@Valid @RequestBody DifusionNewsletterRequest req) {
        List<SuscriptorNewsletter> destinos = suscriptores.findByActivoTrueAndConfirmadoTrue();
        emailService.difundirNewsletter(destinos, req.asunto(), req.contenidoHtml());
        return Map.of("ok", true, "destinatarios", destinos.size(),
                "smtp_configurado", emailService.smtpConfigurado());
    }

    // ─── Log de emails ───────────────────────────────────────────
    @GetMapping("/emails")
    public Page<EmailLog> emails(@RequestParam(defaultValue = "0") int page,
                                 @RequestParam(defaultValue = "30") int size) {
        return emailLog.findAllByOrderByCreadoDesc(PageRequest.of(page, Math.min(size, 100)));
    }
}
