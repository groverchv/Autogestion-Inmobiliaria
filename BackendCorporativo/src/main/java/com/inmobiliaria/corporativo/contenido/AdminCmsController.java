package com.inmobiliaria.corporativo.contenido;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

/**
 * CRUD administrativo del contenido CMS del sitio corporativo.
 * Rutas: /api/corp/admin/{banners|servicios|testimonios|equipo|faqs|oficinas|vacantes|planes|config}
 */
@RestController
@RequestMapping("/api/corp/admin")
public class AdminCmsController {

    private final BannerRepository banners;
    private final ServicioRepository servicios;
    private final TestimonioRepository testimonios;
    private final MiembroEquipoRepository equipo;
    private final FaqRepository faqs;
    private final OficinaRepository oficinas;
    private final VacanteRepository vacantes;
    private final ConfigSitioRepository config;
    private final VersionLanzamientoRepository versiones;
    private final PlanRepository planes;

    public AdminCmsController(BannerRepository banners, ServicioRepository servicios,
                              TestimonioRepository testimonios, MiembroEquipoRepository equipo,
                              FaqRepository faqs, OficinaRepository oficinas,
                              VacanteRepository vacantes, ConfigSitioRepository config,
                              VersionLanzamientoRepository versiones,
                              PlanRepository planes) {
        this.banners = banners;
        this.servicios = servicios;
        this.testimonios = testimonios;
        this.equipo = equipo;
        this.faqs = faqs;
        this.oficinas = oficinas;
        this.vacantes = vacantes;
        this.config = config;
        this.versiones = versiones;
        this.planes = planes;
    }

    // ─── Banners ─────────────────────────────────────────────────
    @GetMapping("/banners")
    public List<Banner> listarBanners() { return banners.findAll(Sort.by("orden")); }

    @PostMapping("/banners")
    public Banner crearBanner(@RequestBody Banner b) { return banners.save(b); }

    @PutMapping("/banners/{id}")
    public Banner actualizarBanner(@PathVariable Long id, @RequestBody Banner b) {
        b.setId(buscar(banners, id).getId());
        return banners.save(b);
    }

    @DeleteMapping("/banners/{id}")
    public ResponseEntity<Void> eliminarBanner(@PathVariable Long id) {
        banners.delete(buscar(banners, id));
        return ResponseEntity.noContent().build();
    }

    // ─── Servicios ───────────────────────────────────────────────
    @GetMapping("/servicios")
    public List<Servicio> listarServicios() { return servicios.findAll(Sort.by("orden")); }

    @PostMapping("/servicios")
    public Servicio crearServicio(@RequestBody Servicio s) { return servicios.save(s); }

    @PutMapping("/servicios/{id}")
    public Servicio actualizarServicio(@PathVariable Long id, @RequestBody Servicio s) {
        s.setId(buscar(servicios, id).getId());
        return servicios.save(s);
    }

    @DeleteMapping("/servicios/{id}")
    public ResponseEntity<Void> eliminarServicio(@PathVariable Long id) {
        servicios.delete(buscar(servicios, id));
        return ResponseEntity.noContent().build();
    }

    // ─── Testimonios ─────────────────────────────────────────────
    @GetMapping("/testimonios")
    public List<Testimonio> listarTestimonios() { return testimonios.findAll(Sort.by("orden")); }

    @PostMapping("/testimonios")
    public Testimonio crearTestimonio(@RequestBody Testimonio t) { return testimonios.save(t); }

    @PutMapping("/testimonios/{id}")
    public Testimonio actualizarTestimonio(@PathVariable Long id, @RequestBody Testimonio t) {
        t.setId(buscar(testimonios, id).getId());
        return testimonios.save(t);
    }

    @DeleteMapping("/testimonios/{id}")
    public ResponseEntity<Void> eliminarTestimonio(@PathVariable Long id) {
        testimonios.delete(buscar(testimonios, id));
        return ResponseEntity.noContent().build();
    }

    // ─── Equipo ──────────────────────────────────────────────────
    @GetMapping("/equipo")
    public List<MiembroEquipo> listarEquipo() { return equipo.findAll(Sort.by("orden")); }

    @PostMapping("/equipo")
    public MiembroEquipo crearMiembro(@RequestBody MiembroEquipo m) { return equipo.save(m); }

    @PutMapping("/equipo/{id}")
    public MiembroEquipo actualizarMiembro(@PathVariable Long id, @RequestBody MiembroEquipo m) {
        m.setId(buscar(equipo, id).getId());
        return equipo.save(m);
    }

    @DeleteMapping("/equipo/{id}")
    public ResponseEntity<Void> eliminarMiembro(@PathVariable Long id) {
        equipo.delete(buscar(equipo, id));
        return ResponseEntity.noContent().build();
    }

    // ─── FAQs ────────────────────────────────────────────────────
    @GetMapping("/faqs")
    public List<Faq> listarFaqs() { return faqs.findAll(Sort.by("orden")); }

    @PostMapping("/faqs")
    public Faq crearFaq(@RequestBody Faq f) { return faqs.save(f); }

    @PutMapping("/faqs/{id}")
    public Faq actualizarFaq(@PathVariable Long id, @RequestBody Faq f) {
        f.setId(buscar(faqs, id).getId());
        return faqs.save(f);
    }

    @DeleteMapping("/faqs/{id}")
    public ResponseEntity<Void> eliminarFaq(@PathVariable Long id) {
        faqs.delete(buscar(faqs, id));
        return ResponseEntity.noContent().build();
    }

    // ─── Oficinas ────────────────────────────────────────────────
    @GetMapping("/oficinas")
    public List<Oficina> listarOficinas() { return oficinas.findAll(); }

    @PostMapping("/oficinas")
    public Oficina crearOficina(@RequestBody Oficina o) { return oficinas.save(o); }

    @PutMapping("/oficinas/{id}")
    public Oficina actualizarOficina(@PathVariable Long id, @RequestBody Oficina o) {
        o.setId(buscar(oficinas, id).getId());
        return oficinas.save(o);
    }

    @DeleteMapping("/oficinas/{id}")
    public ResponseEntity<Void> eliminarOficina(@PathVariable Long id) {
        oficinas.delete(buscar(oficinas, id));
        return ResponseEntity.noContent().build();
    }

    // ─── Vacantes ────────────────────────────────────────────────
    @GetMapping("/vacantes")
    public List<Vacante> listarVacantes() { return vacantes.findAll(Sort.by(Sort.Direction.DESC, "creado")); }

    @PostMapping("/vacantes")
    public Vacante crearVacante(@RequestBody Vacante v) { return vacantes.save(v); }

    @PutMapping("/vacantes/{id}")
    public Vacante actualizarVacante(@PathVariable Long id, @RequestBody Vacante v) {
        v.setId(buscar(vacantes, id).getId());
        return vacantes.save(v);
    }

    @DeleteMapping("/vacantes/{id}")
    public ResponseEntity<Void> eliminarVacante(@PathVariable Long id) {
        vacantes.delete(buscar(vacantes, id));
        return ResponseEntity.noContent().build();
    }

    // ─── Configuración del sitio ─────────────────────────────────
    @GetMapping("/config")
    public List<ConfigSitio> listarConfig() { return config.findAll(Sort.by("clave")); }

    @PutMapping("/config")
    public Map<String, Object> guardarConfig(@RequestBody Map<String, String> valores) {
        valores.forEach((clave, valor) -> {
            if (!clave.startsWith("vapid_")) {
                config.save(new ConfigSitio(clave, valor));
            }
        });
        return Map.of("actualizadas", valores.size());
    }

    // ─── Changelog / versiones ───────────────────────────────────
    @GetMapping("/versiones")
    public List<VersionLanzamiento> listarVersiones() {
        return versiones.findAll(Sort.by(Sort.Direction.DESC, "fechaPublicacion"));
    }

    @PostMapping("/versiones")
    public VersionLanzamiento crearVersion(@RequestBody VersionLanzamiento v) {
        return versiones.save(v);
    }

    @PutMapping("/versiones/{id}")
    public VersionLanzamiento actualizarVersion(@PathVariable Long id, @RequestBody VersionLanzamiento v) {
        v.setId(buscar(versiones, id).getId());
        return versiones.save(v);
    }

    @DeleteMapping("/versiones/{id}")
    public ResponseEntity<Void> eliminarVersion(@PathVariable Long id) {
        versiones.delete(buscar(versiones, id));
        return ResponseEntity.noContent().build();
    }

    // ─── Planes de suscripción ───────────────────────────────────
    @GetMapping("/planes")
    public List<Plan> listarPlanes() { return planes.findAll(Sort.by("orden")); }

    @PostMapping("/planes")
    public Plan crearPlan(@RequestBody Plan p) { return planes.save(p); }

    @PutMapping("/planes/{id}")
    public Plan actualizarPlan(@PathVariable Long id, @RequestBody Plan p) {
        p.setId(buscar(planes, id).getId());
        return planes.save(p);
    }

    @DeleteMapping("/planes/{id}")
    public ResponseEntity<Void> eliminarPlan(@PathVariable Long id) {
        planes.delete(buscar(planes, id));
        return ResponseEntity.noContent().build();
    }

    private <T> T buscar(org.springframework.data.jpa.repository.JpaRepository<T, Long> repo, Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registro no encontrado"));
    }
}
