package com.inmobiliaria.corporativo.integracion;

import com.inmobiliaria.corporativo.seguridad.AdminUsuarioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Set;

/**
 * Subida de imágenes del CMS a Cloudinary + biblioteca de medios del panel.
 */
@RestController
@RequestMapping("/api/corp/admin/uploads")
public class AdminUploadController {

    private static final Set<String> TIPOS_PERMITIDOS = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/avif", "image/gif");

    private final CloudinaryService cloudinary;
    private final MediaRepository media;
    private final AdminUsuarioRepository usuarios;

    public AdminUploadController(CloudinaryService cloudinary, MediaRepository media,
                                 AdminUsuarioRepository usuarios) {
        this.cloudinary = cloudinary;
        this.media = media;
        this.usuarios = usuarios;
    }

    @PostMapping("/imagen")
    public ResponseEntity<Map<String, String>> subir(@RequestParam("archivo") MultipartFile archivo,
                                                     Authentication auth) {
        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Archivo vacío");
        }
        if (!TIPOS_PERMITIDOS.contains(archivo.getContentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tipo de archivo no permitido: " + archivo.getContentType());
        }
        if (archivo.getSize() > 10 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Máximo 10 MB");
        }
        Map<String, String> r = cloudinary.subir(archivo, "cms", "image");

        Media m = new Media();
        m.setUrl(r.get("url"));
        m.setPublicId(r.get("public_id"));
        m.setNombre(archivo.getOriginalFilename());
        m.setBytes(archivo.getSize());
        Object uid = auth != null ? auth.getDetails() : null;
        if (uid instanceof Number n) m.setSubidoPor(usuarios.getReferenceById(n.longValue()));
        media.save(m);

        return ResponseEntity.ok(r);
    }

    /** Biblioteca de medios: últimas imágenes subidas. */
    @GetMapping("/media")
    public Page<Media> media(@RequestParam(defaultValue = "0") int page,
                             @RequestParam(defaultValue = "24") int size) {
        return media.findAllByOrderByCreadoDesc(PageRequest.of(page, Math.min(size, 60)));
    }

    @DeleteMapping("/media/{id}")
    public ResponseEntity<Void> eliminarMedia(@PathVariable Long id) {
        media.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
