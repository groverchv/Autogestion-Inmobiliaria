package com.inmobiliaria.corporativo.contenido;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "oficina")
@Getter
@Setter
public class Oficina {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(length = 250)
    private String direccion;

    @Column(length = 100)
    private String ciudad;

    @Column(length = 40)
    private String telefono;

    @Column(length = 150)
    private String email;

    @Column(length = 150)
    private String horario;

    @Column(name = "maps_url", length = 500)
    private String mapsUrl;

    @Column(precision = 10, scale = 7)
    private BigDecimal lat;

    @Column(precision = 10, scale = 7)
    private BigDecimal lng;

    @Column(nullable = false)
    private Boolean principal = false;

    @Column(nullable = false)
    private Boolean activo = true;
}
