package com.inmobiliaria.corporativo.leads;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/corp/admin/leads")
public class AdminLeadsController {

    public record PatchLead(LeadContacto.Estado estado, String notaInterna) {}

    private final LeadContactoRepository repo;

    public AdminLeadsController(LeadContactoRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public Page<LeadContacto> listar(@RequestParam(required = false) String estado,
                                    @RequestParam(required = false) String tipo,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        PageRequest pr = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "creado"));
        LeadContacto.Estado e = estado != null && !estado.isBlank() ? LeadContacto.Estado.valueOf(estado) : null;
        LeadContacto.Tipo t = tipo != null && !tipo.isBlank() ? LeadContacto.Tipo.valueOf(tipo) : null;
        if (e != null && t != null) return repo.findByEstadoAndTipo(e, t, pr);
        if (e != null) return repo.findByEstado(e, pr);
        if (t != null) return repo.findByTipo(t, pr);
        return repo.findAll(pr);
    }

    @GetMapping("/{id}")
    public LeadContacto obtener(@PathVariable Long id) {
        return buscar(id);
    }

    @PatchMapping("/{id}")
    public LeadContacto actualizar(@PathVariable Long id, @RequestBody PatchLead patch) {
        LeadContacto lead = buscar(id);
        if (patch.estado() != null) lead.setEstado(patch.estado());
        if (patch.notaInterna() != null) lead.setNotaInterna(patch.notaInterna());
        return repo.save(lead);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        repo.delete(buscar(id));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/resumen")
    public Map<String, Object> resumen() {
        return Map.of(
                "nuevos", repo.countByEstado(LeadContacto.Estado.NUEVO),
                "enContacto", repo.countByEstado(LeadContacto.Estado.EN_CONTACTO),
                "cerrados", repo.countByEstado(LeadContacto.Estado.CERRADO),
                "ultimos7dias", repo.countByCreadoAfter(OffsetDateTime.now().minusDays(7)),
                "total", repo.count());
    }

    /** Leads por día de los últimos 14 días (gráfico del panel). */
    @GetMapping("/por-dia")
    public List<Map<String, Object>> porDia() {
        return repo.leadsPorDia(OffsetDateTime.now().minusDays(14)).stream()
                .map(r -> Map.<String, Object>of(
                        "dia", r[0].toString(),
                        "total", ((Number) r[1]).longValue()))
                .toList();
    }

    /** Exportación CSV de todos los leads (filtrable por estado/tipo). */
    @GetMapping("/exportar.csv")
    public ResponseEntity<byte[]> exportarCsv(@RequestParam(required = false) String estado,
                                              @RequestParam(required = false) String tipo) {
        List<LeadContacto> leads;
        LeadContacto.Estado e = estado != null && !estado.isBlank() ? LeadContacto.Estado.valueOf(estado) : null;
        LeadContacto.Tipo t = tipo != null && !tipo.isBlank() ? LeadContacto.Tipo.valueOf(tipo) : null;
        PageRequest pr = PageRequest.of(0, 10_000, Sort.by(Sort.Direction.DESC, "creado"));
        if (e != null && t != null) leads = repo.findByEstadoAndTipo(e, t, pr).getContent();
        else if (e != null) leads = repo.findByEstado(e, pr).getContent();
        else if (t != null) leads = repo.findByTipo(t, pr).getContent();
        else leads = repo.findAll(pr).getContent();

        StringBuilder csv = new StringBuilder("﻿id;fecha;nombre;email;telefono;tipo;estado;asunto;mensaje;adjunto\n");
        DateTimeFormatter f = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        for (LeadContacto l : leads) {
            csv.append(l.getId()).append(';')
               .append(l.getCreado() != null ? l.getCreado().format(f) : "").append(';')
               .append(csv(l.getNombre())).append(';')
               .append(csv(l.getEmail())).append(';')
               .append(csv(l.getTelefono())).append(';')
               .append(l.getTipo()).append(';')
               .append(l.getEstado()).append(';')
               .append(csv(l.getAsunto())).append(';')
               .append(csv(l.getMensaje())).append(';')
               .append(csv(l.getAdjuntoUrl())).append('\n');
        }
        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"contactos-" + java.time.LocalDate.now() + ".csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(bytes);
    }

    private String csv(String v) {
        if (v == null) return "";
        String limpio = v.replace(';', ',').replace("\n", " ").replace("\r", " ");
        // Defensa contra inyección de fórmulas en Excel
        if (!limpio.isEmpty() && "=+-@".indexOf(limpio.charAt(0)) >= 0) limpio = "'" + limpio;
        return limpio;
    }

    private LeadContacto buscar(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lead no encontrado"));
    }
}
