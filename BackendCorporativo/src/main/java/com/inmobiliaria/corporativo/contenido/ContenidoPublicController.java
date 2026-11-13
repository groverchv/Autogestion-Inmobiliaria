package com.inmobiliaria.corporativo.contenido;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/corp/public")
public class ContenidoPublicController {

    private final ContenidoPublicService contenido;

    public ContenidoPublicController(ContenidoPublicService contenido) {
        this.contenido = contenido;
    }

    /** Agregado para la landing: una sola llamada al BFF. */
    @GetMapping("/home")
    public Map<String, Object> home() {
        return contenido.home();
    }

    @GetMapping("/config")
    public Map<String, String> configPublica() {
        return contenido.configPublica();
    }

    @GetMapping("/servicios")
    public List<Servicio> servicios() {
        return contenido.servicios();
    }

    @GetMapping("/testimonios")
    public List<Testimonio> testimonios() {
        return contenido.testimonios();
    }

    @GetMapping("/equipo")
    public List<MiembroEquipo> equipo() {
        return contenido.equipo();
    }

    @GetMapping("/faqs")
    public List<Faq> faqs() {
        return contenido.faqs();
    }

    @GetMapping("/changelog")
    public List<VersionLanzamiento> changelog() {
        return contenido.changelog();
    }

    @GetMapping("/oficinas")
    public List<Oficina> oficinas() {
        return contenido.oficinas();
    }

    @GetMapping("/planes")
    public List<Plan> planes() {
        return contenido.planes();
    }

    @GetMapping("/vacantes")
    public List<Vacante> vacantes() {
        return contenido.vacantes();
    }

    @GetMapping("/blog")
    public Page<BlogPublicDto> posts(@RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "9") int size,
                                     @RequestParam(required = false) String q,
                                     @RequestParam(required = false) String categoria) {
        if (q != null || categoria != null) {
            return contenido.buscarPosts(q, categoria, page, size);
        }
        return contenido.posts(page, size);
    }

    @GetMapping("/blog/categorias")
    public List<String> categorias() {
        return contenido.categorias();
    }

    @GetMapping("/blog/{slug}")
    public ResponseEntity<BlogPublicDto> post(@PathVariable String slug) {
        return contenido.post(slug)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/blog/{slug}/relacionados")
    public List<BlogPublicDto> relacionados(@PathVariable String slug) {
        return contenido.relacionados(slug);
    }

    /** Para sitemap.xml del frontend. */
    @GetMapping("/sitemap-datos")
    public Map<String, Object> sitemapDatos() {
        return Map.of("posts", contenido.sitemapDatos());
    }
}
