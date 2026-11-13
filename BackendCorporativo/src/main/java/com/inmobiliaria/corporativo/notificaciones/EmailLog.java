package com.inmobiliaria.corporativo.notificaciones;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "email_log")
@Getter
@Setter
public class EmailLog {

    public enum Estado { ENVIADO, FALLIDO }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String destinatario;

    @Column(nullable = false, length = 250)
    private String asunto;

    @Column(length = 80)
    private String plantilla;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Estado estado = Estado.ENVIADO;

    @Column(columnDefinition = "TEXT")
    private String error;

    @Column(nullable = false)
    private Integer intentos = 1;

    /** Cuerpo del mensaje para poder reintentar el envío. */
    @Column(columnDefinition = "TEXT")
    private String cuerpoHtml;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime creado = OffsetDateTime.now();
}
