package com.inmobiliaria.corporativo.agente;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "agente_log")
@Getter
@Setter
public class AgenteLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private OffsetDateTime creado = OffsetDateTime.now();

    @Column(nullable = false, length = 1000)
    private String pregunta;

    @Column(nullable = false, length = 20)
    private String proveedor;

    @Column(nullable = false, length = 30)
    private String accion = "ninguna";

    @Column(nullable = false)
    private Integer latenciaMs;

    @Column(nullable = false)
    private Boolean ok = true;
}
