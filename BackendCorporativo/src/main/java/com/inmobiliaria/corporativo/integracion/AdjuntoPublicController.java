package com.inmobiliaria.corporativo.integracion;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Set;

/**
 * Subida pública de CV (postulaciones laborales). Solo PDF/DOC/DOCX, máx 5 MB.
 * Devuelve la URL que el formulario envía junto con el lead.
 */
@RestController
@RequestMapping("/api/corp/public")
public class AdjuntoPublicController {

    private static final Set<String> TIPOS_CV = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    private static final long MAX_BYTES = 5 * 1024 * 1024;

    private final CloudinaryService cloudinary;

    public AdjuntoPublicController(CloudinaryService cloudinary) {
        this.cloudinary = cloudinary;
    }

    @PostMapping("/adjuntos")
    public ResponseEntity<Map<String, String>> subirCv(@RequestParam("archivo") MultipartFile archivo) {
        if (!cloudinary.configurado()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "La subida de archivos no está disponible por ahora");
        }
        if (archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Archivo vacío");
        }
        if (!TIPOS_CV.contains(archivo.getContentType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Solo se aceptan archivos PDF o Word (.doc/.docx)");
        }
        if (archivo.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Máximo 5 MB");
        }
        return ResponseEntity.ok(cloudinary.subir(archivo, "cv", "raw"));
    }
}
