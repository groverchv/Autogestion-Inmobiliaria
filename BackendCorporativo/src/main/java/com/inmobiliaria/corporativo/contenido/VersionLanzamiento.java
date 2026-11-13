package com.inmobiliaria.corporativo.contenido;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Entrada del changelog público (release notes) — Punto 7 del proyecto:
 * sección de actualizaciones del producto en el sitio corporativo.
 */
@Entity
@Table(name = "version_lanzamiento")
@Getter
@Setter
public class VersionLanzamiento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Versión semántica del producto, p.ej. "1.4.2". */
    @Column(nullable = false, length = 20)
    private String version;

    @Column(nullable = false, length = 200)
    private String titulo;

    /** Novedades en Markdown (una por línea con viñetas). */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String descripcionMd;

    /** NUEVO | MEJORA | CORRECCION — controla la insignia visual. */
    @Column(nullable = false, length = 20)
    private String tipo = "NUEVO";

    @Column(nullable = false)
    private LocalDate fechaPublicacion;

    @Column(nullable = false)
    private Boolean publicado = true;
}
