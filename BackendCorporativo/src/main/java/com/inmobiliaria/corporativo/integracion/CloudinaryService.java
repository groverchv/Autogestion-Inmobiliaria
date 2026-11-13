package com.inmobiliaria.corporativo.integracion;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.inmobiliaria.corporativo.config.AppProperties;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Subida de archivos a Cloudinary (imágenes del CMS y CVs de postulantes).
 */
@Service
public class CloudinaryService {

    private final AppProperties props;
    private Cloudinary cloudinary;

    public CloudinaryService(AppProperties props) {
        this.props = props;
    }

    @PostConstruct
    void init() {
        var c = props.getCloudinary();
        if (c.getCloudName() != null && !c.getCloudName().isBlank()) {
            cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", c.getCloudName(),
                    "api_key", c.getApiKey(),
                    "api_secret", c.getApiSecret(),
                    "secure", true));
        }
    }

    public boolean configurado() {
        return cloudinary != null;
    }

    /** Sube un archivo y devuelve url + public_id. */
    public Map<String, String> subir(MultipartFile archivo, String subcarpeta, String resourceType) {
        if (!configurado()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El servicio de archivos no está configurado");
        }
        try {
            Map<?, ?> r = cloudinary.uploader().upload(archivo.getBytes(),
                    ObjectUtils.asMap(
                            "folder", props.getCloudinary().getFolder() + "/" + subcarpeta,
                            "resource_type", resourceType));
            return Map.of(
                    "url", (String) r.get("secure_url"),
                    "public_id", (String) r.get("public_id"));
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Error al subir el archivo");
        }
    }
}
