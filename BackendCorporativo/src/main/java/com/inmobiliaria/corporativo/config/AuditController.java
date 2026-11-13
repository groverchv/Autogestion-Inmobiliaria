package com.inmobiliaria.corporativo.config;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/** Bitácora de cambios del panel (solo lectura, rol ADMIN). */
@RestController
@RequestMapping("/api/corp/admin/auditoria")
public class AuditController {

    private final AuditLogRepository repo;

    public AuditController(AuditLogRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public Page<Map<String, Object>> listar(@RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "30") int size) {
        return repo.findAllByOrderByCreadoDesc(PageRequest.of(page, Math.min(size, 100)))
                .map(a -> {
                    Map<String, Object> m = new LinkedHashMap<String, Object>();
                    m.put("id", a.getId());
                    m.put("email", a.getEmail());
                    m.put("accion", a.getAccion());
                    m.put("recurso", a.getRecurso());
                    m.put("detalle", a.getDetalle());
                    m.put("creado", a.getCreado().toString());
                    return m;
                });
    }
}
