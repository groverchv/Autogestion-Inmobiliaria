package com.inmobiliaria.corporativo.notificaciones;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {
    Page<EmailLog> findAllByOrderByCreadoDesc(Pageable pageable);

    /** Fallidos pendientes de reintento (máximo `intentos` intentos). */
    List<EmailLog> findTop50ByEstadoAndIntentosLessThanOrderByCreadoAsc(
            EmailLog.Estado estado, int intentos);
}
