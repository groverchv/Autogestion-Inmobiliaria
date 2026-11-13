package com.inmobiliaria.corporativo.contenido;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "plan")
@Getter
@Setter
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(nullable = false)
    private BigDecimal precio = BigDecimal.ZERO;

    @Column(nullable = false, length = 10)
    private String moneda = "BOB";

    @Column(nullable = false, length = 30)
    private String periodo = "mes";

    @Column(nullable = false)
    private Integer maxInmuebles = 1;

    /** Una característica por línea; la web las muestra como viñetas. */
    @Column(columnDefinition = "TEXT")
    private String caracteristicas;

    /** El plan resaltado visualmente en el comparador. */
    @Column(nullable = false)
    private Boolean destacado = false;

    @Column(nullable = false, length = 80)
    private String ctaTexto = "Empezar";

    @Column(length = 300)
    private String ctaUrl;

    @Column(nullable = false)
    private Integer orden = 0;

    @Column(nullable = false)
    private Boolean activo = true;
}
