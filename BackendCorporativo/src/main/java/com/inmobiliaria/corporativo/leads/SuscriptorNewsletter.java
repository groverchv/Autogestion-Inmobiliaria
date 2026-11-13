package com.inmobiliaria.corporativo.leads;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "suscriptor_newsletter")
@Getter
@Setter
public class SuscriptorNewsletter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(length = 120)
    private String nombre;

    @Column(nullable = false)
    private Boolean activo = true;

    /** Token opaco del enlace de baja incluido en cada correo. */
    @Column(name = "token_baja", unique = true, length = 64)
    private String tokenBaja = UUID.randomUUID().toString().replace("-", "");

    /** Token del enlace de confirmación (doble opt-in). */
    @Column(name = "token_confirmacion", length = 64)
    private String tokenConfirmacion;

    /** true una vez que el suscriptor confirma su correo. */
    @Column(nullable = false)
    private Boolean confirmado = false;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime creado = OffsetDateTime.now();
}
