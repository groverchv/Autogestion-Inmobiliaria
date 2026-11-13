package com.inmobiliaria.corporativo.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Caché en memoria (Caffeine) para el contenido público del sitio.
 * TTL de 60s: coincide con el Cache-Control HTTP de los GET públicos,
 * y las escrituras del admin también invalidan todo el caché.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    public static final String HOME = "home";
    public static final String CONFIG = "config";
    public static final String LISTAS = "listas";
    public static final String BLOG = "blog";

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager(HOME, CONFIG, LISTAS, BLOG);
        manager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(60, TimeUnit.SECONDS)
                .maximumSize(200)
                .recordStats());
        return manager;
    }
}
