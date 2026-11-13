package com.inmobiliaria.corporativo.leads;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "lead_contacto")
@Getter
@Setter
public class LeadContacto {

    public enum Tipo { CONTACTO, VISITA, VENDER_PROPIEDAD, POSTULACION, SOPORTE }

    public enum Estado { NUEVO, EN_CONTACTO, CERRADO, DESCARTADO }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nombre;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(length = 40)
    private String telefono;

    @Column(length = 200)
    private String asunto;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String mensaje;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Tipo tipo = Tipo.CONTACTO;

    /** ID del inmueble en el backend Django (sin FK: dominio separado). */
    @Column(name = "inmueble_id")
    private Long inmuebleId;

    @Column(name = "vacante_id")
    private Long vacanteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Estado estado = Estado.NUEVO;

    @Column(name = "nota_interna", columnDefinition = "TEXT")
    private String notaInterna;

    @Column(name = "origen_url", length = 400)
    private String origenUrl;

    @Column(name = "adjunto_url", length = 500)
    private String adjuntoUrl;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime creado = OffsetDateTime.now();
}
