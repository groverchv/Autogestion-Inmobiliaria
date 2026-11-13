package com.inmobiliaria.corporativo.integracion;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MediaRepository extends JpaRepository<Media, Long> {
    Page<Media> findAllByOrderByCreadoDesc(Pageable pageable);
}
