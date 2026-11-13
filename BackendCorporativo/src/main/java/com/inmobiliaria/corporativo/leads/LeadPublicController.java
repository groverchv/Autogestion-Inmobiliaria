package com.inmobiliaria.corporativo.leads;

import com.inmobiliaria.corporativo.notificaciones.EmailService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Formularios públicos del sitio corporativo.
 * Todos incluyen honeypot anti-spam (campo "empresa_web" invisible).
 */
@RestController
@RequestMapping("/api/corp/public")
public class LeadPublicController {

    public record LeadRequest(
            @NotBlank @Size(max = 150) String nombre,
            @NotBlank @Email @Size(max = 150) String email,
            @Size(max = 40) String telefono,
            @Size(max = 200) String asunto,
            @NotBlank @Size(max = 4000) String mensaje,
            Long inmuebleId,
            Long vacanteId,
            @Size(max = 400) String origenUrl,
            @Size(max = 500) String adjuntoUrl,
            String empresaWeb) {}

    public record NewsletterRequest(
            @NotBlank @Email String email,
            @Size(max = 120) String nombre,
            String empresaWeb) {}

    public record BajaRequest(@NotBlank String token) {}

    private final LeadContactoRepository leads;
    private final SuscriptorNewsletterRepository suscriptores;
    private final EmailService emailService;

    public LeadPublicController(LeadContactoRepository leads,
                                SuscriptorNewsletterRepository suscriptores,
                                EmailService emailService) {
        this.leads = leads;
        this.suscriptores = suscriptores;
        this.emailService = emailService;
    }

    @PostMapping("/contacto")
    public ResponseEntity<Map<String, Object>> contacto(@Valid @RequestBody LeadRequest req) {
        return crearLead(req, LeadContacto.Tipo.CONTACTO);
    }

    @PostMapping("/visitas")
    public ResponseEntity<Map<String, Object>> visita(@Valid @RequestBody LeadRequest req) {
        return crearLead(req, LeadContacto.Tipo.VISITA);
    }

    @PostMapping("/vender-propiedad")
    public ResponseEntity<Map<String, Object>> vender(@Valid @RequestBody LeadRequest req) {
        return crearLead(req, LeadContacto.Tipo.VENDER_PROPIEDAD);
    }

    @PostMapping("/postulaciones")
    public ResponseEntity<Map<String, Object>> postulacion(@Valid @RequestBody LeadRequest req) {
        return crearLead(req, LeadContacto.Tipo.POSTULACION);
    }

    @PostMapping("/soporte")
    public ResponseEntity<Map<String, Object>> soporte(@Valid @RequestBody LeadRequest req) {
        return crearLead(req, LeadContacto.Tipo.SOPORTE);
    }

    @PostMapping("/newsletter")
    public ResponseEntity<Map<String, Object>> newsletter(@Valid @RequestBody NewsletterRequest req) {
        if (honeypot(req.empresaWeb())) return okFake();

        String email = req.email().toLowerCase().trim();
        var existente = suscriptores.findByEmail(email);
        if (existente.isPresent()) {
            SuscriptorNewsletter s = existente.get();
            if (!s.getActivo()) {
                s.setActivo(true);
                suscriptores.save(s);
            }
            if (!s.getConfirmado()) {
                reenviarConfirmacion(s);
            }
            return ResponseEntity.ok(Map.of("ok", true, "mensaje",
                    s.getConfirmado() ? "Ya estabas suscrito" : "Te reenviamos el correo de confirmación"));
        }
        SuscriptorNewsletter s = new SuscriptorNewsletter();
        s.setEmail(email);
        s.setNombre(req.nombre());
        suscriptores.save(s);
        reenviarConfirmacion(s);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("ok", true, "mensaje",
                        "Revisa tu correo para confirmar la suscripción"));
    }

    private void reenviarConfirmacion(SuscriptorNewsletter s) {
        if (s.getTokenConfirmacion() == null) {
            s.setTokenConfirmacion(java.util.UUID.randomUUID().toString().replace("-", ""));
            suscriptores.save(s);
        }
        emailService.confirmarSuscripcion(s.getEmail(), s.getNombre(), s.getTokenConfirmacion());
    }

    /** Confirmación del doble opt-in (enlace del correo). */
    @GetMapping("/newsletter/confirmar")
    public ResponseEntity<Map<String, Object>> confirmarNewsletter(@RequestParam String token) {
        var opt = suscriptores.findByTokenConfirmacion(token);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "ok", false, "error", "Enlace inválido o ya utilizado"));
        }
        SuscriptorNewsletter s = opt.get();
        s.setConfirmado(true);
        s.setTokenConfirmacion(null);
        suscriptores.save(s);
        emailService.bienvenidaNewsletter(s.getEmail(), s.getNombre(), s.getTokenBaja());
        return ResponseEntity.ok(Map.of(
                "ok", true, "mensaje", "Suscripción confirmada. ¡Bienvenido al boletín!"));
    }

    /** Baja por token opaco (enlace incluido en cada correo). */
    @PostMapping("/newsletter/baja")
    public ResponseEntity<Map<String, Object>> bajaNewsletter(@Valid @RequestBody BajaRequest req) {
        suscriptores.findByTokenBaja(req.token()).ifPresent(s -> {
            s.setActivo(false);
            suscriptores.save(s);
        });
        return ResponseEntity.ok(Map.of("ok", true, "mensaje", "Suscripción cancelada"));
    }

    private ResponseEntity<Map<String, Object>> crearLead(LeadRequest req, LeadContacto.Tipo tipo) {
        if (honeypot(req.empresaWeb())) return okFake();

        LeadContacto lead = new LeadContacto();
        lead.setNombre(req.nombre().trim());
        lead.setEmail(req.email().toLowerCase().trim());
        lead.setTelefono(req.telefono());
        lead.setAsunto(req.asunto());
        lead.setMensaje(req.mensaje());
        lead.setTipo(tipo);
        lead.setInmuebleId(req.inmuebleId());
        lead.setVacanteId(req.vacanteId());
        lead.setOrigenUrl(req.origenUrl());
        lead.setAdjuntoUrl(req.adjuntoUrl());
        lead = leads.save(lead);

        emailService.confirmarLead(lead);
        emailService.notificarNuevoLead(lead);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("ok", true, "id", lead.getId(),
                        "mensaje", "Solicitud recibida. Te contactaremos pronto."));
    }

    /** Honeypot llenado = bot. Responde éxito falso sin persistir. */
    private boolean honeypot(String empresaWeb) {
        return empresaWeb != null && !empresaWeb.isBlank();
    }

    private ResponseEntity<Map<String, Object>> okFake() {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("ok", true, "mensaje", "Solicitud recibida."));
    }
}
