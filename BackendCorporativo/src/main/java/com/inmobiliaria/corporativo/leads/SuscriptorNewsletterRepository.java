package com.inmobiliaria.corporativo.leads;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SuscriptorNewsletterRepository extends JpaRepository<SuscriptorNewsletter, Long> {
    Optional<SuscriptorNewsletter> findByEmail(String email);
    Optional<SuscriptorNewsletter> findByTokenBaja(String tokenBaja);
    Optional<SuscriptorNewsletter> findByTokenConfirmacion(String tokenConfirmacion);
    /** Solo los confirmados reciben campañas (doble opt-in). */
    List<SuscriptorNewsletter> findByActivoTrueAndConfirmadoTrue();
    long countByActivoTrue();
    long countByActivoTrueAndConfirmadoTrue();
}
