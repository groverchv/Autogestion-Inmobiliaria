package com.inmobiliaria.corporativo.contenido;

import com.inmobiliaria.corporativo.config.CacheConfig;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Capa de lectura del contenido público con caché Caffeine.
 * Las escrituras del panel admin invalidan todo el caché vía interceptor
 * (WebConfig) — aquí solo se define el método de vaciado completo.
 */
@Service
public class ContenidoPublicService {

    private final BannerRepository banners;
    private final ServicioRepository servicios;
    private final TestimonioRepository testimonios;
    private final MiembroEquipoRepository equipo;
    private final FaqRepository faqs;
    private final OficinaRepository oficinas;
    private final VacanteRepository vacantes;
    private final BlogPostRepository blog;
    private final ConfigSitioRepository config;
    private final VersionLanzamientoRepository versiones;
    private final PlanRepository planes;

    public ContenidoPublicService(BannerRepository banners, ServicioRepository servicios,
                                  TestimonioRepository testimonios, MiembroEquipoRepository equipo,
                                  FaqRepository faqs, OficinaRepository oficinas,
                                  VacanteRepository vacantes, BlogPostRepository blog,
                                  ConfigSitioRepository config,
                                  VersionLanzamientoRepository versiones,
                                  PlanRepository planes) {
        this.banners = banners;
        this.servicios = servicios;
        this.testimonios = testimonios;
        this.equipo = equipo;
        this.faqs = faqs;
        this.oficinas = oficinas;
        this.vacantes = vacantes;
        this.blog = blog;
        this.config = config;
        this.versiones = versiones;
        this.planes = planes;
    }

    /** Agregado para la landing: una sola llamada al BFF. */
    @Cacheable(CacheConfig.HOME)
    public Map<String, Object> home() {
        Map<String, Object> data = new HashMap<>();
        data.put("banners", banners.findByActivoTrueOrderByOrdenAsc());
        data.put("servicios", servicios.findByActivoTrueOrderByOrdenAsc());
        data.put("testimonios", testimonios.findByActivoTrueOrderByOrdenAsc());
        data.put("equipo", equipo.findByActivoTrueOrderByOrdenAsc());
        data.put("faqs", faqs.findByActivoTrueOrderByOrdenAsc());
        data.put("posts", blog.findTop3ByEstadoOrderByPublicadoAtDesc(BlogPost.Estado.PUBLICADO)
                .stream().map(BlogPublicDto::resumen).toList());
        data.put("config", configPublica());
        return data;
    }

    @Cacheable(CacheConfig.CONFIG)
    public Map<String, String> configPublica() {
        Map<String, String> map = new HashMap<>();
        for (ConfigSitio c : config.findAll()) {
            // Nunca exponer claves privadas (VAPID privada, etc.)
            if (!c.getClave().startsWith("vapid_privada") && !c.getClave().startsWith("vapid_public_x962")) {
                map.put(c.getClave(), c.getValor());
            }
        }
        return map;
    }

    @Cacheable(value = CacheConfig.LISTAS, key = "'servicios'")
    public List<Servicio> servicios() {
        return servicios.findByActivoTrueOrderByOrdenAsc();
    }

    @Cacheable(value = CacheConfig.LISTAS, key = "'testimonios'")
    public List<Testimonio> testimonios() {
        return testimonios.findByActivoTrueOrderByOrdenAsc();
    }

    @Cacheable(value = CacheConfig.LISTAS, key = "'equipo'")
    public List<MiembroEquipo> equipo() {
        return equipo.findByActivoTrueOrderByOrdenAsc();
    }

    @Cacheable(value = CacheConfig.LISTAS, key = "'faqs'")
    public List<Faq> faqs() {
        return faqs.findByActivoTrueOrderByOrdenAsc();
    }

    @Cacheable(value = CacheConfig.LISTAS, key = "'changelog'")
    public List<VersionLanzamiento> changelog() {
        return versiones.findPublicadas();
    }

    @Cacheable(value = CacheConfig.LISTAS, key = "'oficinas'")
    public List<Oficina> oficinas() {
        return oficinas.findByActivoTrueOrderByPrincipalDescIdAsc();
    }

    @Cacheable(value = CacheConfig.LISTAS, key = "'planes'")
    public List<Plan> planes() {
        return planes.findByActivoTrueOrderByOrdenAsc();
    }

    @Cacheable(value = CacheConfig.LISTAS, key = "'vacantes'")
    public List<Vacante> vacantes() {
        return vacantes.findByActivoTrueOrderByCreadoDesc();
    }

    @Cacheable(value = CacheConfig.BLOG, key = "'page-' + #page + '-' + #size")
    public Page<BlogPublicDto> posts(int page, int size) {
        return blog.findByEstadoOrderByPublicadoAtDesc(
                        BlogPost.Estado.PUBLICADO, PageRequest.of(page, Math.min(size, 24)))
                .map(BlogPublicDto::resumen);
    }

    @Cacheable(value = CacheConfig.BLOG, key = "'post-' + #slug")
    public Optional<BlogPublicDto> post(String slug) {
        return blog.findBySlugAndEstado(slug, BlogPost.Estado.PUBLICADO)
                .map(BlogPublicDto::completo);
    }

    /** Búsqueda + filtro por categoría. Sin caché: consultas variables. */
    public Page<BlogPublicDto> buscarPosts(String q, String categoria, int page, int size) {
        String query = q != null && !q.isBlank() ? q.trim() : null;
        String cat = categoria != null && !categoria.isBlank() ? categoria.trim() : null;
        return blog.buscarPublicados(query, cat, PageRequest.of(page, Math.min(size, 24)))
                .map(BlogPublicDto::resumen);
    }

    @Cacheable(value = CacheConfig.BLOG, key = "'categorias'")
    public List<String> categorias() {
        return blog.categoriasPublicadas();
    }

    /** Artículos relacionados: misma categoría, excluyendo el actual. */
    public List<BlogPublicDto> relacionados(String slug) {
        return blog.findBySlugAndEstado(slug, BlogPost.Estado.PUBLICADO)
                .filter(p -> p.getCategoria() != null)
                .map(p -> blog.findTop3ByEstadoAndCategoriaAndIdNotOrderByPublicadoAtDesc(
                                BlogPost.Estado.PUBLICADO, p.getCategoria(), p.getId())
                        .stream().map(BlogPublicDto::resumen).toList())
                .orElse(List.of());
    }

    /** Para sitemap.xml del frontend. */
    @Cacheable(value = CacheConfig.BLOG, key = "'sitemap'")
    public List<Map<String, String>> sitemapDatos() {
        return blog.findByEstadoOrderByPublicadoAtDesc(
                        BlogPost.Estado.PUBLICADO, PageRequest.of(0, 500, Sort.unsorted()))
                .map(p -> Map.of("slug", p.getSlug(),
                        "fecha", p.getActualizado() != null ? p.getActualizado().toString() : ""))
                .getContent();
    }

    /** Invalida todo el caché público. Se invoca tras escrituras del admin. */
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.HOME, allEntries = true),
            @CacheEvict(value = CacheConfig.CONFIG, allEntries = true),
            @CacheEvict(value = CacheConfig.LISTAS, allEntries = true),
            @CacheEvict(value = CacheConfig.BLOG, allEntries = true)
    })
    public void vaciar() {
        // La anotación realiza el vaciado.
    }
}
