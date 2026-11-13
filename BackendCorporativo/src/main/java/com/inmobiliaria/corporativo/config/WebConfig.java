package com.inmobiliaria.corporativo.config;

import com.inmobiliaria.corporativo.contenido.ContenidoPublicService;
import com.inmobiliaria.corporativo.seguridad.AdminUsuarioRepository;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Política HTTP de la API:
 * - GET /api/corp/public/** → Cache-Control: public, max-age=60 (navegador y
 *   proxies pueden reutilizar respuestas un minuto; el contenido CMS cambia poco).
 * - Escrituras /api/corp/admin/** (POST/PUT/PATCH/DELETE) → invalida el caché
 *   de contenido público tras completarse.
 * - /api/corp/admin/** → Cache-Control: no-store (datos privados).
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final ContenidoPublicService contenido;
    private final AuditLogRepository audit;
    private final AdminUsuarioRepository usuarios;

    public WebConfig(ContenidoPublicService contenido, AuditLogRepository audit,
                     AdminUsuarioRepository usuarios) {
        this.contenido = contenido;
        this.audit = audit;
        this.usuarios = usuarios;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new CacheHeaders());
        registry.addInterceptor(new AdminCacheEviccion())
                .addPathPatterns("/api/corp/admin/**");
        registry.addInterceptor(new AdminAuditoria())
                .addPathPatterns("/api/corp/admin/**");
    }

    /** GET público → cacheable 60s; cualquier otra ruta/método → no-store. */
    @Component
    static class CacheHeaders implements HandlerInterceptor {
        @Override
        public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
            boolean publico = request.getRequestURI().startsWith("/api/corp/public/")
                    && HttpMethod.GET.matches(request.getMethod());
            response.setHeader("Cache-Control",
                    publico ? "public, max-age=60" : "no-store");
            return true;
        }
    }

    class AdminCacheEviccion implements HandlerInterceptor {
        @Override
        public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                    Object handler, Exception ex) {
            if (!HttpMethod.GET.matches(request.getMethod()) && response.getStatus() < 400) {
                contenido.vaciar();
            }
        }
    }

    /** Registra cada escritura del panel: quién, qué método, qué recurso. */
    class AdminAuditoria implements HandlerInterceptor {
        @Override
        public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                    Object handler, Exception ex) {
            if (HttpMethod.GET.matches(request.getMethod()) || response.getStatus() >= 400) return;
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null) return;
            AuditLog a = new AuditLog();
            a.setEmail(auth.getName());
            Object uid = auth.getDetails();
            if (uid instanceof Number n) a.setAdmin(usuarios.getReferenceById(n.longValue()));
            a.setAccion(request.getMethod());
            String uri = request.getRequestURI().replace("/api/corp/admin/", "");
            a.setRecurso(uri.length() > 200 ? uri.substring(0, 200) : uri);
            a.setDetalle("HTTP " + response.getStatus());
            audit.save(a);
        }
    }
}
