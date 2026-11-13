package com.inmobiliaria.corporativo.notificaciones;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Reintenta correos fallidos cada 10 minutos, hasta 3 intentos por mensaje.
 * Solo reintenta cuando SMTP está configurado (si el fallo fue por falta de
 * configuración, el cuerpo ni siquiera se renderizó).
 */
@Component
public class EmailRetryScheduler {

    private static final int MAX_INTENTOS = 3;
    private static final Logger log = LoggerFactory.getLogger(EmailRetryScheduler.class);

    private final EmailLogRepository repo;
    private final EmailService emailService;

    public EmailRetryScheduler(EmailLogRepository repo, EmailService emailService) {
        this.repo = repo;
        this.emailService = emailService;
    }

    @Scheduled(fixedDelay = 10 * 60 * 1000, initialDelay = 60 * 1000)
    public void reintentarFallidos() {
        if (!emailService.smtpConfigurado()) return;
        List<EmailLog> pendientes = repo.findTop50ByEstadoAndIntentosLessThanOrderByCreadoAsc(
                EmailLog.Estado.FALLIDO, MAX_INTENTOS);
        for (EmailLog e : pendientes) {
            emailService.reintentar(e);
        }
        if (!pendientes.isEmpty()) {
            log.info("Reintentos de email procesados: {}", pendientes.size());
        }
    }
}
