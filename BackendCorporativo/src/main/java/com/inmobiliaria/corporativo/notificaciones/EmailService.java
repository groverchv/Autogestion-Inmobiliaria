package com.inmobiliaria.corporativo.notificaciones;

import com.inmobiliaria.corporativo.config.AppProperties;
import com.inmobiliaria.corporativo.leads.LeadContacto;
import com.inmobiliaria.corporativo.leads.SuscriptorNewsletter;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Envío de correos transaccionales del sitio corporativo.
 * Todos los envíos son asíncronos y quedan registrados en email_log.
 * Si SMTP no está configurado, los envíos se omiten sin fallar (modo dev).
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final EmailLogRepository emailLog;
    private final AppProperties props;

    @Value("${spring.mail.username:}")
    private String remitente;

    public EmailService(JavaMailSender mailSender, TemplateEngine templateEngine,
                        EmailLogRepository emailLog, AppProperties props) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
        this.emailLog = emailLog;
        this.props = props;
    }

    public boolean smtpConfigurado() {
        return remitente != null && !remitente.isBlank();
    }

    /** Confirmación al visitante que dejó un mensaje/lead. */
    @Async
    public void confirmarLead(LeadContacto lead) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("nombre", lead.getNombre());
        vars.put("tipo", etiquetaTipo(lead.getTipo()));
        vars.put("mensaje", lead.getMensaje());
        enviar(lead.getEmail(), "Recibimos tu mensaje — Inmobiliaria 360", "lead-confirmacion", vars);
    }

    /** Aviso interno al equipo comercial de un nuevo lead. */
    @Async
    public void notificarNuevoLead(LeadContacto lead) {
        String destino = props.getNotificaciones().getEmailDestino();
        if (destino == null || destino.isBlank()) {
            // Respaldo: si no hay correo de notificaciones explícito,
            // avisar al correo del administrador — nunca perder un lead.
            destino = props.getAdmin().getEmail();
        }
        if (destino == null || destino.isBlank()) return;
        Map<String, Object> vars = new HashMap<>();
        vars.put("nombre", lead.getNombre());
        vars.put("email", lead.getEmail());
        vars.put("telefono", lead.getTelefono());
        vars.put("tipo", etiquetaTipo(lead.getTipo()));
        vars.put("asunto", lead.getAsunto());
        vars.put("mensaje", lead.getMensaje());
        vars.put("inmuebleId", lead.getInmuebleId());
        vars.put("adjuntoUrl", lead.getAdjuntoUrl());
        vars.put("origenUrl", lead.getOrigenUrl());
        enviar(destino, "Nueva solicitud de contacto: " + etiquetaTipo(lead.getTipo()) + " — " + lead.getNombre(),
                "lead-admin", vars);
    }

    /** Correo de confirmación del doble opt-in. */
    @Async
    public void confirmarSuscripcion(String email, String nombre, String tokenConfirmacion) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("nombre", nombre != null && !nombre.isBlank() ? nombre : "Suscriptor");
        vars.put("enlaceConfirmacion",
                props.getFrontendUrl() + "/confirmar?token=" + tokenConfirmacion);
        enviar(email, "Confirma tu suscripción — Inmobiliaria 360", "newsletter-confirmar", vars);
    }

    /** Bienvenida a la newsletter (tras confirmar). */
    @Async
    public void bienvenidaNewsletter(String email, String nombre, String tokenBaja) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("nombre", nombre != null && !nombre.isBlank() ? nombre : "Suscriptor");
        vars.put("enlaceBaja", props.getFrontendUrl() + "/baja?token=" + tokenBaja);
        enviar(email, "Bienvenido al boletín de Inmobiliaria 360", "newsletter-bienvenida", vars);
    }

    /** Difusión de campaña a suscriptores activos y confirmados. */
    @Async
    public void difundirNewsletter(List<SuscriptorNewsletter> destinatarios, String asunto, String contenidoHtml) {
        for (SuscriptorNewsletter s : destinatarios) {
            Map<String, Object> vars = new HashMap<>();
            vars.put("contenido", contenidoHtml);
            vars.put("email", s.getEmail());
            vars.put("enlaceBaja", props.getFrontendUrl() + "/baja?token=" + s.getTokenBaja());
            enviar(s.getEmail(), asunto, "newsletter-difusion", vars);
        }
    }

    void enviar(String destinatario, String asunto, String plantilla, Map<String, Object> vars) {
        EmailLog registro = new EmailLog();
        registro.setDestinatario(destinatario);
        registro.setAsunto(asunto);
        registro.setPlantilla(plantilla);

        if (!smtpConfigurado()) {
            registro.setEstado(EmailLog.Estado.FALLIDO);
            registro.setError("SMTP no configurado (MAIL_USERNAME vacío)");
            emailLog.save(registro);
            log.info("Email omitido (SMTP no configurado): {} -> {}", asunto, destinatario);
            return;
        }
        try {
            Context ctx = new Context();
            ctx.setVariables(vars);
            String html = templateEngine.process("email/" + plantilla, ctx);
            registro.setCuerpoHtml(html);

            MimeMessage mensaje = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mensaje, "UTF-8");
            helper.setTo(destinatario);
            helper.setSubject(asunto);
            helper.setFrom(remitente, "Inmobiliaria 360");
            helper.setText(html, true);
            mailSender.send(mensaje);

            registro.setEstado(EmailLog.Estado.ENVIADO);
        } catch (Exception e) {
            registro.setEstado(EmailLog.Estado.FALLIDO);
            registro.setError(e.getMessage());
            log.warn("Fallo al enviar email a {}: {}", destinatario, e.getMessage());
        }
        emailLog.save(registro);
    }

    /**
     * Reintenta un correo fallido usando el cuerpo HTML ya renderizado.
     * Devuelve true si el envío tuvo éxito.
     */
    boolean reintentar(EmailLog registro) {
        if (!smtpConfigurado() || registro.getCuerpoHtml() == null) return false;
        try {
            MimeMessage mensaje = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mensaje, "UTF-8");
            helper.setTo(registro.getDestinatario());
            helper.setSubject(registro.getAsunto());
            helper.setFrom(remitente, "Inmobiliaria 360");
            helper.setText(registro.getCuerpoHtml(), true);
            mailSender.send(mensaje);
            registro.setEstado(EmailLog.Estado.ENVIADO);
            registro.setError(null);
            emailLog.save(registro);
            return true;
        } catch (Exception e) {
            registro.setIntentos(registro.getIntentos() + 1);
            registro.setError(e.getMessage());
            emailLog.save(registro);
            log.warn("Reintento {} fallido para {}: {}", registro.getIntentos(),
                    registro.getDestinatario(), e.getMessage());
            return false;
        }
    }

    private String etiquetaTipo(LeadContacto.Tipo tipo) {
        return switch (tipo) {
            case CONTACTO -> "Contacto general";
            case VISITA -> "Solicitud de visita";
            case VENDER_PROPIEDAD -> "Vender mi propiedad";
            case POSTULACION -> "Postulación laboral";
            case SOPORTE -> "Soporte";
        };
    }
}
