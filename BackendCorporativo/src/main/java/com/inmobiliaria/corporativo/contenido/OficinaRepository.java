package com.inmobiliaria.corporativo.contenido;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OficinaRepository extends JpaRepository<Oficina, Long> {
    List<Oficina> findByActivoTrueOrderByPrincipalDescIdAsc();
}
