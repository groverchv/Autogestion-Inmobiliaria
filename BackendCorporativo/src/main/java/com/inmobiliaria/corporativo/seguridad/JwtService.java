package com.inmobiliaria.corporativo.seguridad;

import com.inmobiliaria.corporativo.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {

    private final SecretKey key;
    private final AppProperties props;

    public JwtService(AppProperties props) {
        this.props = props;
        this.key = Keys.hmacShaKeyFor(props.getJwt().getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public String generarAccessToken(AdminUsuario usuario) {
        return Jwts.builder()
                .subject(usuario.getEmail())
                .claims(Map.of(
                        "uid", usuario.getId(),
                        "nombre", usuario.getNombre(),
                        "rol", usuario.getRol().name(),
                        "tipo", "access"))
                .issuedAt(new Date())
                .expiration(Date.from(Instant.now().plus(props.getJwt().getAccessMinutes(), ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();
    }

    public String generarRefreshToken(AdminUsuario usuario) {
        return Jwts.builder()
                .subject(usuario.getEmail())
                .claims(Map.of("uid", usuario.getId(), "tipo", "refresh"))
                .issuedAt(new Date())
                .expiration(Date.from(Instant.now().plus(props.getJwt().getRefreshDays(), ChronoUnit.DAYS)))
                .signWith(key)
                .compact();
    }

    public Claims validar(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
