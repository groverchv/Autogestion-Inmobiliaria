package com.inmobiliaria.corporativo.contenido;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MiembroEquipoRepository extends JpaRepository<MiembroEquipo, Long> {
    List<MiembroEquipo> findByActivoTrueOrderByOrdenAsc();
}
