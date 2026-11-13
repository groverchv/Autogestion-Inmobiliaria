package com.inmobiliaria.corporativo.contenido;

import java.time.OffsetDateTime;

public record BlogPublicDto(
        Long id,
        String slug,
        String titulo,
        String resumen,
        String contenidoMd,
        String portadaUrl,
        String categoria,
        String autorNombre,
        OffsetDateTime publicadoAt) {

    public static BlogPublicDto resumen(BlogPost p) {
        return new BlogPublicDto(p.getId(), p.getSlug(), p.getTitulo(), p.getResumen(),
                null, p.getPortadaUrl(), p.getCategoria(), autor(p), p.getPublicadoAt());
    }

    public static BlogPublicDto completo(BlogPost p) {
        return new BlogPublicDto(p.getId(), p.getSlug(), p.getTitulo(), p.getResumen(),
                p.getContenidoMd(), p.getPortadaUrl(), p.getCategoria(), autor(p), p.getPublicadoAt());
    }

    private static String autor(BlogPost p) {
        return p.getAutor() != null ? p.getAutor().getNombre() : "Inmobiliaria 360";
    }
}
