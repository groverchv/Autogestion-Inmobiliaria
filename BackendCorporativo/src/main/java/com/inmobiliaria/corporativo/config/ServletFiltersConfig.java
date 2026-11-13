package com.inmobiliaria.corporativo.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.ShallowEtagHeaderFilter;

/**
 * ETag débil para respuestas GET: el navegador/BFF recibe 304 Not Modified
 * cuando el contenido no cambió, ahorrando ancho de banda.
 */
@Configuration
public class ServletFiltersConfig {

    @Bean
    public FilterRegistrationBean<ShallowEtagHeaderFilter> etagFilter() {
        FilterRegistrationBean<ShallowEtagHeaderFilter> reg = new FilterRegistrationBean<>();
        reg.setFilter(new ShallowEtagHeaderFilter());
        reg.addUrlPatterns("/api/corp/public/*");
        reg.setName("etagFilter");
        return reg;
    }
}
