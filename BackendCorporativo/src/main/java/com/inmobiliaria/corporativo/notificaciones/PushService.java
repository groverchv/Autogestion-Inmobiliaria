package com.inmobiliaria.corporativo.notificaciones;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inmobiliaria.corporativo.config.AppProperties;
import com.inmobiliaria.corporativo.contenido.ConfigSitio;
import com.inmobiliaria.corporativo.contenido.ConfigSitioRepository;
import jakarta.annotation.PostConstruct;
import nl.martijndwars.webpush.Notification;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.security.*;
import java.security.interfaces.ECPublicKey;
import java.security.spec.*;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Notificaciones Web Push (VAPID) del sitio corporativo.
 * Las claves VAPID se generan en el primer arranque y se persisten
 * en config_sitio (nunca se exponen salvo la pública del navegador).
 */
@Service
public class PushService {

    private static final Logger log = LoggerFactory.getLogger(PushService.class);

    private final SuscriptorPushRepository repo;
    private final ConfigSitioRepository config;
    private final AppProperties props;
    private final ObjectMapper mapper = new ObjectMapper();

    private volatile nl.martijndwars.webpush.PushService pushService;
    private volatile String vapidPublicKey;

    public PushService(SuscriptorPushRepository repo, ConfigSitioRepository config,
                       AppProperties props) {
        this.repo = repo;
        this.config = config;
        this.props = props;
    }

    @PostConstruct
    void init() {
        try {
            if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                Security.addProvider(new BouncyCastleProvider());
            }
            KeyPair par = cargarOGenerarPar();
            this.vapidPublicKey = puntoPublicoBase64((ECPublicKey) par.getPublic());

            var svc = new nl.martijndwars.webpush.PushService();
            svc.setPublicKey(par.getPublic());
            svc.setPrivateKey(par.getPrivate());
            svc.setSubject(props.getPush().getSubject());
            this.pushService = svc;
            log.info("Web Push inicializado. Clave pública VAPID lista ({} suscriptores activos).",
                    repo.countByActivoTrue());
        } catch (Exception e) {
            log.error("No se pudo inicializar Web Push: {}", e.getMessage());
        }
    }

    /** Clave pública VAPID en base64url (formato applicationServerKey del navegador). */
    public String getVapidPublicKey() {
        return vapidPublicKey;
    }

    public SuscriptorPush suscribir(String endpoint, String p256dh, String auth, String userAgent) {
        SuscriptorPush sub = repo.findByEndpoint(endpoint).orElseGet(SuscriptorPush::new);
        sub.setEndpoint(endpoint);
        sub.setP256dh(p256dh);
        sub.setAuth(auth);
        sub.setUserAgent(userAgent != null && userAgent.length() > 300
                ? userAgent.substring(0, 300) : userAgent);
        sub.setActivo(true);
        return repo.save(sub);
    }

    public void desuscribir(String endpoint) {
        repo.findByEndpoint(endpoint).ifPresent(s -> {
            s.setActivo(false);
            repo.save(s);
        });
    }

    /** Difusión asíncrona a todos los suscriptores activos. */
    @Async
    public void difundir(String titulo, String cuerpo, String url) {
        if (pushService == null) {
            log.warn("Push no inicializado; difusión omitida: {}", titulo);
            return;
        }
        List<SuscriptorPush> activos = repo.findByActivoTrue();
        if (activos.isEmpty()) return;

        String payload;
        try {
            payload = mapper.writeValueAsString(Map.of(
                    "title", titulo,
                    "body", cuerpo != null ? cuerpo : "",
                    "icon", "/icons/icon-192.png",
                    "url", url != null ? url : "/"));
        } catch (Exception e) {
            return;
        }

        int ok = 0, bajas = 0;
        for (SuscriptorPush sub : activos) {
            try {
                Notification notification = new Notification(
                        sub.getEndpoint(), sub.getP256dh(), sub.getAuth(),
                        payload.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                HttpResponse resp = pushService.send(notification);
                int status = resp.getStatusLine().getStatusCode();
                if (status == 404 || status == 410) {
                    sub.setActivo(false);
                    repo.save(sub);
                    bajas++;
                } else if (status >= 200 && status < 300) {
                    ok++;
                }
            } catch (Exception e) {
                log.debug("Error enviando push a suscriptor {}: {}", sub.getId(), e.getMessage());
            }
        }
        log.info("Difusión push completada: {} enviadas, {} dadas de baja ({}).", ok, bajas, titulo);
    }

    public long contarActivos() {
        return repo.countByActivoTrue();
    }

    // ─── Gestión de par de claves VAPID ──────────────────────────────

    private KeyPair cargarOGenerarPar() throws GeneralSecurityException {
        var privada = config.findById("vapid_privada_pkcs8");
        var publica = config.findById("vapid_publica_x962");

        KeyFactory kf = KeyFactory.getInstance("EC");
        if (privada.isPresent() && publica.isPresent()) {
            byte[] privBytes = Base64.getUrlDecoder().decode(privada.get().getValor());
            byte[] pubBytes = Base64.getUrlDecoder().decode(publica.get().getValor());
            return new KeyPair(
                    kf.generatePublic(new X509EncodedKeySpec(pubBytes)),
                    kf.generatePrivate(new PKCS8EncodedKeySpec(privBytes)));
        }

        KeyPairGenerator gen = KeyPairGenerator.getInstance("EC");
        gen.initialize(new ECGenParameterSpec("secp256r1"), new SecureRandom());
        KeyPair par = gen.generateKeyPair();

        config.save(new ConfigSitio("vapid_privada_pkcs8",
                Base64.getUrlEncoder().withoutPadding().encodeToString(par.getPrivate().getEncoded())));
        config.save(new ConfigSitio("vapid_publica_x962",
                Base64.getUrlEncoder().withoutPadding().encodeToString(par.getPublic().getEncoded())));
        log.info("Par de claves VAPID generado y persistido en config_sitio.");
        return par;
    }

    /** Punto público EC sin comprimir (65B: 0x04||X||Y) en base64url. */
    private String puntoPublicoBase64(ECPublicKey publicKey) {
        byte[] x = a32(publicKey.getW().getAffineX());
        byte[] y = a32(publicKey.getW().getAffineY());
        byte[] uncompressed = new byte[65];
        uncompressed[0] = 0x04;
        System.arraycopy(x, 0, uncompressed, 1, 32);
        System.arraycopy(y, 0, uncompressed, 33, 32);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(uncompressed);
    }

    private byte[] a32(BigInteger n) {
        byte[] b = n.toByteArray();
        byte[] out = new byte[32];
        int srcPos = Math.max(0, b.length - 32);
        int len = Math.min(32, b.length);
        System.arraycopy(b, srcPos, out, 32 - len, len);
        return out;
    }
}
