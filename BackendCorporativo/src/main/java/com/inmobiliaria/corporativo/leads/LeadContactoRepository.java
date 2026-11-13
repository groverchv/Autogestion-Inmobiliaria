package com.inmobiliaria.corporativo.leads;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface LeadContactoRepository extends JpaRepository<LeadContacto, Long> {
    Page<LeadContacto> findByEstado(LeadContacto.Estado estado, Pageable pageable);
    Page<LeadContacto> findByTipo(LeadContacto.Tipo tipo, Pageable pageable);
    Page<LeadContacto> findByEstadoAndTipo(LeadContacto.Estado estado, LeadContacto.Tipo tipo, Pageable pageable);
    long countByEstado(LeadContacto.Estado estado);
    long countByCreadoAfter(OffsetDateTime desde);

    /** Leads por día (últimos N días) para el gráfico del panel. */
    @Query(value = """
            select cast(creado as date) as dia, count(*) as total
            from lead_contacto
            where creado >= :desde
            group by cast(creado as date)
            order by dia
            """, nativeQuery = true)
    List<Object[]> leadsPorDia(@Param("desde") OffsetDateTime desde);
}
