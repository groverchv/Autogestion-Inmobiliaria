package com.inmobiliaria.corporativo.seguridad;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * Gestión de usuarios del panel administrativo (solo rol ADMIN).
 * EDITOR puede cambiar su propia contraseña.
 */
@RestController
@RequestMapping("/api/corp/admin/usuarios")
public class AdminUsuariosController {

    public record UsuarioRequest(
            @NotBlank @Email @Size(max = 150) String email,
            @NotBlank @Size(max = 120) String nombre,
            @NotBlank String rol,            // ADMIN | EDITOR
            String password) {}              // requerido al crear

    public record PasswordRequest(
            @NotBlank String actual,
            @NotBlank @Size(min = 8, max = 100) String nueva) {}

    private final AdminUsuarioRepository repo;
    private final PasswordEncoder encoder;

    public AdminUsuariosController(AdminUsuarioRepository repo, PasswordEncoder encoder) {
        this.repo = repo;
        this.encoder = encoder;
    }

    @GetMapping
    public List<Map<String, Object>> listar() {
        return repo.findAll().stream().map(u -> {
            Map<String, Object> m = new java.util.LinkedHashMap<String, Object>();
            m.put("id", u.getId());
            m.put("email", u.getEmail());
            m.put("nombre", u.getNombre());
            m.put("rol", u.getRol().name());
            m.put("activo", u.getActivo());
            m.put("creado", u.getCreado().toString());
            return (Map<String, Object>) m;
        }).toList();
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> crear(@Valid @RequestBody UsuarioRequest req) {
        String email = req.email().toLowerCase().trim();
        if (repo.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un usuario con ese correo");
        }
        if (req.password() == null || req.password().length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "La contraseña debe tener al menos 8 caracteres");
        }
        AdminUsuario u = new AdminUsuario();
        u.setEmail(email);
        u.setNombre(req.nombre());
        u.setRol(rol(req.rol()));
        u.setPasswordHash(encoder.encode(req.password()));
        repo.save(u);
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        out.put("ok", true);
        out.put("id", u.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(out);
    }

    @PutMapping("/{id}")
    public Map<String, Object> actualizar(@PathVariable Long id, @Valid @RequestBody UsuarioRequest req) {
        AdminUsuario u = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        u.setNombre(req.nombre());
        u.setRol(rol(req.rol()));
        String email = req.email().toLowerCase().trim();
        repo.findByEmail(email).filter(o -> !o.getId().equals(id)).ifPresent(o -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ese correo ya está en uso");
        });
        u.setEmail(email);
        if (req.password() != null && !req.password().isBlank()) {
            if (req.password().length() < 8) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "La contraseña debe tener al menos 8 caracteres");
            }
            u.setPasswordHash(encoder.encode(req.password()));
        }
        repo.save(u);
        return Map.of("ok", true);
    }

    @PatchMapping("/{id}/activo")
    public Map<String, Object> activo(@PathVariable Long id, @RequestBody Map<String, Boolean> body,
                                      Authentication auth) {
        AdminUsuario u = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        if (u.getEmail().equalsIgnoreCase(auth.getName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No puedes desactivar tu propia cuenta");
        }
        u.setActivo(Boolean.TRUE.equals(body.get("activo")));
        repo.save(u);
        return Map.of("ok", true);
    }

    /** Cualquier usuario autenticado cambia su propia contraseña. */
    @PostMapping("/mi-password")
    public Map<String, Object> miPassword(@Valid @RequestBody PasswordRequest req,
                                          Authentication auth) {
        AdminUsuario u = repo.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        if (!encoder.matches(req.actual(), u.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La contraseña actual es incorrecta");
        }
        u.setPasswordHash(encoder.encode(req.nueva()));
        repo.save(u);
        return Map.of("ok", true);
    }

    private AdminUsuario.Rol rol(String v) {
        try {
            return AdminUsuario.Rol.valueOf(v.toUpperCase());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rol inválido: " + v);
        }
    }
}
