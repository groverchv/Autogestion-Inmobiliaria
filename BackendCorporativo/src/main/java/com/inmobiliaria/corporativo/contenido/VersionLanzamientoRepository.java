package com.inmobiliaria.corporativo.contenido;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface VersionLanzamientoRepository extends JpaRepository<VersionLanzamiento, Long> {

    /** Changelog público: publicadas, más recientes primero y por versión desc. */
    @Query("SELECT v FROM VersionLanzamiento v WHERE v.publicado = true "
         + "ORDER BY v.fechaPublicacion DESC, v.version DESC")
    List<VersionLanzamiento> findPublicadas();
}
