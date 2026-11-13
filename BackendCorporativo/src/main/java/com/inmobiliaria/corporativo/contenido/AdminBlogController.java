package com.inmobiliaria.corporativo.contenido;

import com.inmobiliaria.corporativo.notificaciones.PushService;
import com.inmobiliaria.corporativo.seguridad.AdminUsuario;
import com.inmobiliaria.corporativo.seguridad.AdminUsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/corp/admin/blog")
public class AdminBlogController {

    private final BlogPostRepository repo;
    private final AdminUsuarioRepository usuarios;
    private final PushService pushService;

    public AdminBlogController(BlogPostRepository repo, AdminUsuarioRepository usuarios,
                               PushService pushService) {
        this.repo = repo;
        this.usuarios = usuarios;
        this.pushService = pushService;
    }

    @GetMapping
    public Page<BlogPost> listar(@RequestParam(defaultValue = "0") int page,
                                 @RequestParam(defaultValue = "20") int size,
                                 @RequestParam(required = false) String estado) {
        PageRequest pr = PageRequest.of(page, Math.min(size, 50), Sort.by(Sort.Direction.DESC, "actualizado"));
        if (estado != null) {
            return repo.findByEstadoOrderByPublicadoAtDesc(BlogPost.Estado.valueOf(estado), pr);
        }
        return repo.findAll(pr);
    }

    @GetMapping("/{id}")
    public BlogPost obtener(@PathVariable Long id) {
        return buscar(id);
    }

    @PostMapping
    public ResponseEntity<BlogPost> crear(@RequestBody BlogPost post, Authentication auth) {
        post.setId(null);
        if (post.getSlug() == null || post.getSlug().isBlank()) {
            post.setSlug(slugUnico(post.getTitulo()));
        }
        usuarios.findByEmail(auth.getName()).ifPresent(post::setAutor);
        aplicarEstado(post);
        BlogPost guardado = repo.save(post);
        notificarSiPublica(guardado);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    @PutMapping("/{id}")
    public BlogPost actualizar(@PathVariable Long id, @RequestBody BlogPost post, Authentication auth) {
        BlogPost existente = buscar(id);
        boolean eraBorrador = existente.getEstado() != BlogPost.Estado.PUBLICADO;
        existente.setTitulo(post.getTitulo());
        existente.setResumen(post.getResumen());
        existente.setContenidoMd(post.getContenidoMd());
        existente.setPortadaUrl(post.getPortadaUrl());
        existente.setCategoria(post.getCategoria());
        if (post.getSlug() != null && !post.getSlug().equals(existente.getSlug())) {
            existente.setSlug(slugUnico(post.getSlug()));
        }
        if (post.getEstado() != null) {
            existente.setEstado(post.getEstado());
        }
        aplicarEstado(existente);
        BlogPost guardado = repo.save(existente);
        if (eraBorrador && guardado.getEstado() == BlogPost.Estado.PUBLICADO) {
            notificarSiPublica(guardado);
        }
        return guardado;
    }

    @PostMapping("/{id}/publicar")
    public BlogPost publicar(@PathVariable Long id) {
        BlogPost post = buscar(id);
        boolean eraBorrador = post.getEstado() != BlogPost.Estado.PUBLICADO;
        post.setEstado(BlogPost.Estado.PUBLICADO);
        aplicarEstado(post);
        BlogPost guardado = repo.save(post);
        if (eraBorrador) notificarSiPublica(guardado);
        return guardado;
    }

    @PostMapping("/{id}/despublicar")
    public BlogPost despublicar(@PathVariable Long id) {
        BlogPost post = buscar(id);
        post.setEstado(BlogPost.Estado.BORRADOR);
        return repo.save(post);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        repo.delete(buscar(id));
        return ResponseEntity.noContent().build();
    }

    private void aplicarEstado(BlogPost post) {
        if (post.getEstado() == BlogPost.Estado.PUBLICADO && post.getPublicadoAt() == null) {
            post.setPublicadoAt(OffsetDateTime.now());
        }
    }

    /** Notificación push automática a suscriptores cuando se publica un post. */
    private void notificarSiPublica(BlogPost post) {
        if (post.getEstado() == BlogPost.Estado.PUBLICADO) {
            pushService.difundir(
                    "Nuevo artículo: " + post.getTitulo(),
                    post.getResumen() != null ? post.getResumen() : "Lee la novedad en nuestro blog",
                    "/blog/" + post.getSlug());
        }
    }

    private BlogPost buscar(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post no encontrado"));
    }

    private String slugUnico(String base) {
        String slug = slugify(base);
        String candidato = slug;
        int i = 2;
        while (repo.existsBySlug(candidato)) {
            candidato = slug + "-" + i++;
        }
        return candidato;
    }

    private String slugify(String texto) {
        String normalizado = Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        String slug = normalizado.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return slug.isBlank() ? "post-" + System.currentTimeMillis() : slug;
    }
}
