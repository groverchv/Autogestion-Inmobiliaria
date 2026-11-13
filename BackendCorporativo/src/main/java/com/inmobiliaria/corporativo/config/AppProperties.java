package com.inmobiliaria.corporativo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Jwt jwt = new Jwt();
    private final Cors cors = new Cors();
    private final Admin admin = new Admin();
    private final Cloudinary cloudinary = new Cloudinary();
    private final Push push = new Push();
    private final Notificaciones notificaciones = new Notificaciones();
    private final RateLimit rateLimit = new RateLimit();
    private final Agente agente = new Agente();

    public Jwt getJwt() { return jwt; }
    public Cors getCors() { return cors; }
    public Admin getAdmin() { return admin; }
    public Cloudinary getCloudinary() { return cloudinary; }
    public Push getPush() { return push; }
    public Notificaciones getNotificaciones() { return notificaciones; }
    public RateLimit getRateLimit() { return rateLimit; }
    public Agente getAgente() { return agente; }

    public static class Jwt {
        private String secret;
        private long accessMinutes = 120;
        private long refreshDays = 7;
        public String getSecret() { return secret; }
        public void setSecret(String secret) { this.secret = secret; }
        public long getAccessMinutes() { return accessMinutes; }
        public void setAccessMinutes(long accessMinutes) { this.accessMinutes = accessMinutes; }
        public long getRefreshDays() { return refreshDays; }
        public void setRefreshDays(long refreshDays) { this.refreshDays = refreshDays; }
    }

    public static class Cors {
        private List<String> allowedOrigins = List.of("http://localhost:5174");
        public List<String> getAllowedOrigins() { return allowedOrigins; }
        public void setAllowedOrigins(List<String> allowedOrigins) { this.allowedOrigins = allowedOrigins; }
    }

    public static class Admin {
        private String email;
        private String password;
        private String nombre;
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getNombre() { return nombre; }
        public void setNombre(String nombre) { this.nombre = nombre; }
    }

    public static class Cloudinary {
        private String cloudName;
        private String apiKey;
        private String apiSecret;
        private String folder = "corporativo";
        public String getCloudName() { return cloudName; }
        public void setCloudName(String cloudName) { this.cloudName = cloudName; }
        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public String getApiSecret() { return apiSecret; }
        public void setApiSecret(String apiSecret) { this.apiSecret = apiSecret; }
        public String getFolder() { return folder; }
        public void setFolder(String folder) { this.folder = folder; }
    }

    public static class Push {
        private String subject = "mailto:contacto@inmobiliaria360.com";
        public String getSubject() { return subject; }
        public void setSubject(String subject) { this.subject = subject; }
    }

    public static class Notificaciones {
        private String emailDestino;
        public String getEmailDestino() { return emailDestino; }
        public void setEmailDestino(String emailDestino) { this.emailDestino = emailDestino; }
    }

    public static class RateLimit {
        private int publicPostPerMinute = 10;
        private int authPerMinute = 5;
        public int getPublicPostPerMinute() { return publicPostPerMinute; }
        public void setPublicPostPerMinute(int n) { this.publicPostPerMinute = n; }
        public int getAuthPerMinute() { return authPerMinute; }
        public void setAuthPerMinute(int n) { this.authPerMinute = n; }
    }

    public static class Agente {
        private boolean habilitado = true;
        private String groqApiKey = "";
        private String geminiApiKey = "";
        private String modelo = "llama-3.3-70b-versatile";
        private String geminiModelo = "gemini-2.0-flash";
        private int maxTokens = 400;
        private int maxHistorial = 8;
        public boolean isHabilitado() { return habilitado; }
        public void setHabilitado(boolean v) { this.habilitado = v; }
        public String getGroqApiKey() { return groqApiKey; }
        public void setGroqApiKey(String v) { this.groqApiKey = v; }
        public String getGeminiApiKey() { return geminiApiKey; }
        public void setGeminiApiKey(String v) { this.geminiApiKey = v; }
        public String getModelo() { return modelo; }
        public void setModelo(String v) { this.modelo = v; }
        public String getGeminiModelo() { return geminiModelo; }
        public void setGeminiModelo(String v) { this.geminiModelo = v; }
        public int getMaxTokens() { return maxTokens; }
        public void setMaxTokens(int v) { this.maxTokens = v; }
        public int getMaxHistorial() { return maxHistorial; }
        public void setMaxHistorial(int v) { this.maxHistorial = v; }
        public boolean configurado() { return !groqApiKey.isBlank() || !geminiApiKey.isBlank(); }
    }

    private String frontendUrl = "http://localhost:5174";
    public String getFrontendUrl() { return frontendUrl; }
    public void setFrontendUrl(String v) { this.frontendUrl = v; }
}
