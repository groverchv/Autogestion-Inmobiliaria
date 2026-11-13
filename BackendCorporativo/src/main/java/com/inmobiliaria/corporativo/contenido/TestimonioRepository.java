package com.inmobiliaria.corporativo.contenido;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TestimonioRepository extends JpaRepository<Testimonio, Long> {
    List<Testimonio> findByActivoTrueOrderByOrdenAsc();
}
