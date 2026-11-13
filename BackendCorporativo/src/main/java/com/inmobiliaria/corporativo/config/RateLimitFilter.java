package com.inmobiliaria.corporativo.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limit por IP para formularios públicos (POST /api/corp/public/**).
 * La IP real llega vía X-Forwarded-For desde el servidor SvelteKit (BFF).
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final int perMinute;
    private final int authPerMinute;

    public RateLimitFilter(AppProperties props) {
        this.perMinute = props.getRateLimit().getPublicPostPerMinute();
        this.authPerMinute = props.getRateLimit().getAuthPerMinute();
    }

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        if (!"POST".equals(request.getMethod())) return true;
        String uri = request.getRequestURI();
        return !(uri.startsWith("/api/corp/public/") || uri.startsWith("/api/corp/auth/"));
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        String ip = clientIp(request);
        // Auth tiene límite más estricto: anti fuerza bruta en el login admin
        int limite = request.getRequestURI().startsWith("/api/corp/auth/")
                ? authPerMinute : perMinute;
        String key = limite + ":" + ip;
        Bucket bucket = buckets.computeIfAbsent(key, k -> Bucket.builder()
                .addLimit(Bandwidth.simple(limite, Duration.ofMinutes(1)))
                .build());
        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Demasiadas solicitudes. Intenta en un minuto.\"}");
        }
    }

    private String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
