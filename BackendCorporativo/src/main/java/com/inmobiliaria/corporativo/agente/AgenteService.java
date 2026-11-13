package com.inmobiliaria.corporativo.agente;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inmobiliaria.corporativo.config.AppProperties;
import com.inmobiliaria.corporativo.contenido.ContenidoPublicService;
import com.inmobiliaria.corporativo.leads.LeadContacto;
import com.inmobiliaria.corporativo.leads.LeadContactoRepository;
import com.inmobiliaria.corporativo.notificaciones.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Agente IA del sitio corporativo.
 * Responde con JSON: {"texto": "...", "sugerencias": [...], "accion": {...}}.
 * Proveedores: Groq -> Gemini (fallback). Contexto vivo del CMS por request.
 */
@Service
public class AgenteService {

    private static final Logger log = LoggerFactory.getLogger(AgenteService.class);

    public record Mensaje(String rol, String texto) {}

    public record Respuesta(String texto, List<String> sugerencias,
                            Map<String, Object> accion, String proveedor) {
        static Respuesta fallback() {
            return new Respuesta(
                    "El asistente no está disponible en este momento. Escríbenos por WhatsApp o déjanos tus datos en el formulario de contacto y te respondemos pronto.",
                    List.of("Ver formas de contacto"), Map.of("tipo", "ninguna"), "fallback");
        }
    }

    private final AppProperties props;
    private final ContenidoPublicService contenido;
    private final LeadContactoRepository leads;
    private final EmailService emailService;
    private final AgenteLogRepository agenteLogs;
    private final ObjectMapper json = new ObjectMapper();
    private final RestClient http = RestClient.builder()
            .requestInterceptor((req, body, exec) -> {
                req.getHeaders().setContentType(MediaType.APPLICATION_JSON);
                return exec.execute(req, body);
            }).build();

    public AgenteService(AppProperties props, ContenidoPublicService contenido,
                         LeadContactoRepository leads, EmailService emailService,
                         AgenteLogRepository agenteLogs) {
        this.props = props;
        this.contenido = contenido;
        this.leads = leads;
        this.emailService = emailService;
        this.agenteLogs = agenteLogs;
    }

    public boolean habilitado() {
        return props.getAgente().isHabilitado() && props.getAgente().configurado();
    }

    public Respuesta responder(String mensaje, List<Mensaje> historial) {
        long t0 = System.nanoTime();
        Respuesta r = responderInterno(mensaje, historial);
        registrar(mensaje, r, (System.nanoTime() - t0) / 1_000_000);
        return r;
    }

    private Respuesta responderInterno(String mensaje, List<Mensaje> historial) {
        String system = promptSistema();
        // Groq primero; Gemini si falla o falta la llave
        if (!props.getAgente().getGroqApiKey().isBlank()) {
            try {
                Respuesta r = llamarGroq(system, mensaje, historial);
                return ejecutar(r, "groq");
            } catch (Exception e) {
                log.warn("Agente: Groq falló ({}), intentando Gemini", e.getMessage());
            }
        }
        if (!props.getAgente().getGeminiApiKey().isBlank()) {
            try {
                Respuesta r = llamarGemini(system, mensaje, historial);
                return ejecutar(r, "gemini");
            } catch (Exception e) {
                log.warn("Agente: Gemini también falló ({})", e.getMessage());
            }
        }
        return Respuesta.fallback();
    }

    /** Bitácora para el panel admin: qué pregunta la gente y cómo respondió el agente. */
    private void registrar(String mensaje, Respuesta r, long latenciaMs) {
        try {
            AgenteLog entrada = new AgenteLog();
            entrada.setPregunta(recortar(mensaje, 1000));
            entrada.setProveedor(r.proveedor());
            Object tipo = r.accion().get("tipo");
            entrada.setAccion(tipo instanceof String s ? recortar(s, 30) : "ninguna");
            entrada.setLatenciaMs((int) Math.min(latenciaMs, Integer.MAX_VALUE));
            entrada.setOk(!"fallback".equals(r.proveedor()));
            agenteLogs.save(entrada);
        } catch (Exception e) {
            log.warn("Agente: no se pudo registrar la interacción ({})", e.getMessage());
        }
    }

    // ─── Prompt con datos reales del CMS ─────────────────────────
    private String promptSistema() {
        var cfg = contenido.configPublica();
        var sb = new StringBuilder();
        sb.append("Eres el asistente virtual de ").append(cfg.getOrDefault("nombre_empresa", "Inmobiliaria 360"))
          .append(", una inmobiliaria. Hablas español, tono amable y profesional.\n");
        sb.append("REGLAS DURAS: responde SOLO con el JSON pedido; no inventes precios, ")
          .append("teléfonos ni datos que no estén en la información de la empresa; ")
          .append("si no sabes algo, ofrece contactar con un asesor (accion lead); ")
          .append("máximo 3 oraciones en 'texto'; nunca uses jerga técnica.\n");
        sb.append("DATOS DE LA EMPRESA: ").append(cfg).append("\n");
        var servicios = contenido.servicios();
        if (!servicios.isEmpty()) {
            sb.append("SERVICIOS: ");
            servicios.forEach(s -> sb.append(s.getTitulo()).append(" - ")
                    .append(recortar(s.getDescripcion(), 120)).append(" | "));
            sb.append("\n");
        }
        var faqs = contenido.faqs();
        if (!faqs.isEmpty()) {
            sb.append("PREGUNTAS FRECUENTES (úsalo para responder): ");
            faqs.forEach(f -> sb.append(f.getPregunta()).append(" => ")
                    .append(recortar(f.getRespuesta(), 150)).append(" | "));
            sb.append("\n");
        }
        var planes = contenido.planes();
        if (!planes.isEmpty()) {
            sb.append("PLANES Y PRECIOS (úsalos si preguntan costos): ");
            planes.forEach(p -> sb.append(p.getNombre()).append(": ")
                    .append(p.getPrecio().stripTrailingZeros().toPlainString()).append(" ")
                    .append(p.getMoneda()).append("/").append(p.getPeriodo())
                    .append(", hasta ").append(p.getMaxInmuebles()).append(" propiedades | "));
            sb.append("\n");
        }
        sb.append("FORMATO DE RESPUESTA (JSON estricto):\n")
          .append("{\"texto\": string, \"sugerencias\": string[] (0-3 preguntas cortas que el usuario ")
          .append("podría hacer después), \"accion\": {\"tipo\": \"ninguna\"|\"lead\"|\"whatsapp\"}}.\n")
          .append("Usa accion lead SOLO cuando el usuario da datos de contacto (nombre + email o teléfono) ")
          .append("y quiere ser contactado: incluye nombre, contacto y motivo en la accion: ")
          .append("{\"tipo\":\"lead\",\"nombre\":...,\"contacto\":...,\"motivo\":...}.\n")
          .append("Usa accion whatsapp cuando el usuario pida hablar con una persona y haya ")
          .append("whatsapp en los datos de empresa (no inventes el número).");
        return sb.toString();
    }

    private static String recortar(String s, int max) {
        if (s == null) return "";
        String t = s.replaceAll("\\s+", " ").trim();
        return t.length() > max ? t.substring(0, max) + "…" : t;
    }

    // ─── Groq (API compatible con OpenAI) ────────────────────────
    private Respuesta llamarGroq(String system, String mensaje, List<Mensaje> historial) {
        var p = props.getAgente();
        var msgs = new java.util.ArrayList<Map<String, String>>();
        msgs.add(Map.of("role", "system", "content", system));
        historial.stream().limit(p.getMaxHistorial()).forEach(m ->
                msgs.add(Map.of("role", m.rol().equals("agente") ? "assistant" : "user",
                                "content", m.texto())));
        msgs.add(Map.of("role", "user", "content", mensaje));

        String body = http.post()
                .uri("https://api.groq.com/openai/v1/chat/completions")
                .header("Authorization", "Bearer " + p.getGroqApiKey())
                .body(Map.of(
                        "model", p.getModelo(),
                        "messages", msgs,
                        "max_tokens", p.getMaxTokens(),
                        "temperature", 0.3,
                        "response_format", Map.of("type", "json_object")))
                .retrieve()
                .body(String.class);
        JsonNode n = json(body);
        String contenidoTxt = n.path("choices").path(0).path("message").path("content").asText("");
        return parsear(contenidoTxt);
    }

    // ─── Gemini ──────────────────────────────────────────────────
    private Respuesta llamarGemini(String system, String mensaje, List<Mensaje> historial) {
        var p = props.getAgente();
        var sb = new StringBuilder(system).append("\n\nCONVERSACIÓN:\n");
        historial.stream().limit(p.getMaxHistorial()).forEach(m ->
                sb.append(m.rol().equals("agente") ? "Asistente" : "Usuario")
                  .append(": ").append(m.texto()).append("\n"));
        sb.append("Usuario: ").append(mensaje);

        String body = http.post()
                .uri("https://generativelanguage.googleapis.com/v1beta/models/"
                        + p.getGeminiModelo() + ":generateContent?key=" + p.getGeminiApiKey())
                .body(Map.of(
                        "contents", List.of(Map.of("parts", List.of(Map.of("text", sb.toString())))),
                        "generationConfig", Map.of(
                                "maxOutputTokens", p.getMaxTokens(),
                                "temperature", 0.3,
                                "responseMimeType", "application/json")))
                .retrieve()
                .body(String.class);
        JsonNode n = json(body);
        String txt = n.path("candidates").path(0).path("content")
                .path("parts").path(0).path("text").asText("");
        return parsear(txt);
    }

    // ─── Parseo tolerante de la respuesta del LLM ────────────────
    private Respuesta parsear(String txt) {
        try {
            int ini = txt.indexOf('{'), fin = txt.lastIndexOf('}');
            JsonNode n = json(txt.substring(ini, fin + 1));
            String texto = n.path("texto").asText("");
            var sugerencias = new java.util.ArrayList<String>();
            n.path("sugerencias").forEach(s -> sugerencias.add(s.asText()));
            Map<String, Object> accion = n.has("accion")
                    ? json.convertValue(n.get("accion"), Map.class) : Map.of();
            if (texto.isBlank()) return Respuesta.fallback();
            return new Respuesta(texto, sugerencias, accion, "");
        } catch (Exception e) {
            log.warn("Agente: respuesta no-JSON del LLM, devolviendo como texto");
            String limpio = txt == null ? "" : txt.strip();
            if (limpio.isBlank()) return Respuesta.fallback();
            return new Respuesta(recortar(limpio, 400), List.of(), Map.of(), "");
        }
    }

    private JsonNode json(String body) {
        try {
            return json.readTree(body);
        } catch (Exception e) {
            throw new RuntimeException("respuesta inválida del proveedor LLM");
        }
    }

    // ─── Ejecución de la acción declarada por el agente ──────────
    private Respuesta ejecutar(Respuesta r, String proveedor) {
        Object tipo = r.accion().get("tipo");
        if ("lead".equals(tipo)) {
            String nombre = str(r.accion().get("nombre"));
            String contacto = str(r.accion().get("contacto"));
            String motivo = str(r.accion().get("motivo"));
            if (nombre != null && contacto != null) {
                LeadContacto lead = new LeadContacto();
                lead.setNombre(recortar(nombre, 150));
                lead.setEmail(contacto.contains("@") ? recortar(contacto, 150) : "chat@sin-email.local");
                lead.setTelefono(contacto.contains("@") ? null : recortar(contacto, 40));
                lead.setAsunto("Asistente virtual — " + recortar(motivo == null ? "consulta" : motivo, 100));
                lead.setMensaje("Contacto generado por el asistente virtual.\nMotivo: " + recortar(motivo, 500));
                lead.setTipo(LeadContacto.Tipo.CONTACTO);
                lead.setOrigenUrl("chat-agente");
                lead = leads.save(lead);
                emailService.confirmarLead(lead);
                emailService.notificarNuevoLead(lead);
                log.info("Agente: lead capturado id={} ({})", lead.getId(), motivo);
            }
        }
        return new Respuesta(r.texto(), r.sugerencias(), r.accion(), proveedor);
    }

    private static String str(Object o) {
        return o instanceof String s && !s.isBlank() ? s : null;
    }
}
