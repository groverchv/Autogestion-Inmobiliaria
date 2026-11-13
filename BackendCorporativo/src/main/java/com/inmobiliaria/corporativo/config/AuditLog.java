package com.inmobiliaria.corporativo.config;

import com.inmobiliaria.corporativo.seguridad.AdminUsuario;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "audit_log")
@Getter
@Setter
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id")
    private AdminUsuario admin;

    @Column(length = 150)
    private String email;

    @Column(nullable = false, length = 10)
    private String accion;

    @Column(nullable = false, length = 200)
    private String recurso;

    @Column(length = 300)
    private String detalle;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime creado = OffsetDateTime.now();
}
