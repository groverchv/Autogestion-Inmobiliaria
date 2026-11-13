package com.inmobiliaria.corporativo.notificaciones;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SuscriptorPushRepository extends JpaRepository<SuscriptorPush, Long> {
    Optional<SuscriptorPush> findByEndpoint(String endpoint);
    List<SuscriptorPush> findByActivoTrue();
    long countByActivoTrue();
}
