package com.inmobiliaria.corporativo.contenido;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "vacante")
@Getter
@Setter
public class Vacante {

    public enum Tipo { TIEMPO_COMPLETO, MEDIO_TIEMPO, PRACTICAS, FREELANCE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(length = 100)
    private String area;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(columnDefinition = "TEXT")
    private String requisitos;

    @Column(length = 120)
    private String ubicacion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Tipo tipo = Tipo.TIEMPO_COMPLETO;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime creado = OffsetDateTime.now();
}
