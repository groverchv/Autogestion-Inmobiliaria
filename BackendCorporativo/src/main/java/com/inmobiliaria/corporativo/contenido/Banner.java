package com.inmobiliaria.corporativo.contenido;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "banner")
@Getter
@Setter
public class Banner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(length = 300)
    private String subtitulo;

    @Column(name = "imagen_url", length = 500)
    private String imagenUrl;

    @Column(name = "cta_texto", length = 80)
    private String ctaTexto;

    @Column(name = "cta_url", length = 300)
    private String ctaUrl;

    @Column(nullable = false)
    private Integer orden = 0;

    @Column(nullable = false)
    private Boolean activo = true;
}
