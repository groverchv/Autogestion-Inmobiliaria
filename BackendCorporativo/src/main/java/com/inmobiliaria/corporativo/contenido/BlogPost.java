package com.inmobiliaria.corporativo.contenido;

import com.inmobiliaria.corporativo.seguridad.AdminUsuario;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Entity
@Table(name = "blog_post")
@Getter
@Setter
public class BlogPost {

    public enum Estado { BORRADOR, PUBLICADO }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 220)
    private String slug;

    @Column(nullable = false, length = 220)
    private String titulo;

    @Column(length = 400)
    private String resumen;

    @Column(name = "contenido_md", columnDefinition = "TEXT")
    private String contenidoMd;

    @Column(name = "portada_url", length = 500)
    private String portadaUrl;

    @Column(length = 60)
    private String categoria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "autor_id")
    private AdminUsuario autor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Estado estado = Estado.BORRADOR;

    @Column(name = "publicado_at")
    private OffsetDateTime publicadoAt;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime creado = OffsetDateTime.now();

    @Column(nullable = false)
    private OffsetDateTime actualizado = OffsetDateTime.now();

    @PreUpdate
    void onUpdate() {
        this.actualizado = OffsetDateTime.now();
    }
}
