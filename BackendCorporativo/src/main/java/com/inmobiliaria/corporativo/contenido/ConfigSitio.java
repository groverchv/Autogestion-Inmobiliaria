package com.inmobiliaria.corporativo.contenido;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "config_sitio")
@Getter
@Setter
public class ConfigSitio {

    @Id
    @Column(length = 80)
    private String clave;

    @Column(columnDefinition = "TEXT")
    private String valor;

    public ConfigSitio() {}

    public ConfigSitio(String clave, String valor) {
        this.clave = clave;
        this.valor = valor;
    }
}
