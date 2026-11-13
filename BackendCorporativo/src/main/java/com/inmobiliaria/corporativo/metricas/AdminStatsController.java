package com.inmobiliaria.corporativo.metricas;

import com.inmobiliaria.corporativo.contenido.BlogPost;
import com.inmobiliaria.corporativo.contenido.BlogPostRepository;
import com.inmobiliaria.corporativo.leads.LeadContacto;
import com.inmobiliaria.corporativo.leads.LeadContactoRepository;
import com.inmobiliaria.corporativo.leads.SuscriptorNewsletterRepository;
import com.inmobiliaria.corporativo.notificaciones.PushService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/corp/admin/stats")
public class AdminStatsController {

    private final LeadContactoRepository leads;
    private final SuscriptorNewsletterRepository newsletter;
    private final BlogPostRepository blog;
    private final PushService pushService;

    public AdminStatsController(LeadContactoRepository leads,
                                SuscriptorNewsletterRepository newsletter,
                                BlogPostRepository blog, PushService pushService) {
        this.leads = leads;
        this.newsletter = newsletter;
        this.blog = blog;
        this.pushService = pushService;
    }

    @GetMapping
    public Map<String, Object> stats() {
        Map<String, Object> data = new HashMap<>();
        data.put("leads_nuevos", leads.countByEstado(LeadContacto.Estado.NUEVO));
        data.put("leads_total", leads.count());
        data.put("suscriptores_newsletter", newsletter.countByActivoTrueAndConfirmadoTrue());
        data.put("suscriptores_push", pushService.contarActivos());
        data.put("posts_publicados",
                blog.findByEstadoOrderByPublicadoAtDesc(BlogPost.Estado.PUBLICADO, PageRequest.of(0, 1))
                        .getTotalElements());
        data.put("ultimos_leads",
                leads.findAll(PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "creado"))).getContent());
        data.put("leads_por_dia",
                leads.leadsPorDia(java.time.OffsetDateTime.now().minusDays(14)).stream()
                        .map(r -> java.util.Map.of("dia", r[0].toString(), "total", ((Number) r[1]).longValue()))
                        .toList());
        return data;
    }
}
