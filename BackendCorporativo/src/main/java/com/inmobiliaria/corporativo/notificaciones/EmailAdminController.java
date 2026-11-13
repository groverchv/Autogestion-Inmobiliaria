package com.inmobiliaria.corporativo.notificaciones;

import com.inmobiliaria.corporativo.config.AppProperties;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Diagnóstico de email: permite al admin comprobar que el SMTP está bien
 * configurado enviándose un correo de prueba a sí mismo.
 */
@RestController
@RequestMapping("/api/corp/admin/email-test")
public class EmailAdminController {

    private final EmailService emailService;
    private final AppProperties props;

    public EmailAdminController(EmailService emailService, AppProperties props) {
        this.emailService = emailService;
        this.props = props;
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> probar() {
        String destino = props.getNotificaciones().getEmailDestino();
        if (destino == null || destino.isBlank()) {
            destino = props.getAdmin().getEmail();
        }
        Map<String, Object> vars = new HashMap<>();
        vars.put("nombre", "Prueba del sistema");
        vars.put("email", "test@corporativo.local");
        vars.put("telefono", "-");
        vars.put("tipo", "PRUEBA");
        vars.put("asunto", "Correo de verificación SMTP");
        vars.put("mensaje",
            "Si recibes este correo, las notificaciones de contacto del sitio "
            + "funcionan correctamente y los mensajes de clientes llegarán aquí.");
        vars.put("inmuebleId", null);
        vars.put("adjuntoUrl", null);
        vars.put("origenUrl", "panel-admin/email-test");
        emailService.enviar(destino, "Prueba de notificaciones — Inmobiliaria 360", "lead-admin", vars);

        Map<String, Object> resp = new HashMap<>();
        resp.put("smtpConfigurado", emailService.smtpConfigurado());
        resp.put("destinatario", destino);
        resp.put("mensaje", emailService.smtpConfigurado()
            ? "Correo de prueba enviado a " + destino + ". Revisa tu bandeja (y spam)."
            : "SMTP no configurado: el envío quedó registrado pero no salió. "
              + "Completa MAIL_USERNAME y MAIL_PASSWORD en el .env");
        return ResponseEntity.ok(resp);
    }
}
