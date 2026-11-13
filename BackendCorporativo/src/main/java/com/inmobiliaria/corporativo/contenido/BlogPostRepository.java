package com.inmobiliaria.corporativo.contenido;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {
    Optional<BlogPost> findBySlug(String slug);
    Optional<BlogPost> findBySlugAndEstado(String slug, BlogPost.Estado estado);
    Page<BlogPost> findByEstadoOrderByPublicadoAtDesc(BlogPost.Estado estado, Pageable pageable);
    List<BlogPost> findTop3ByEstadoOrderByPublicadoAtDesc(BlogPost.Estado estado);
    boolean existsBySlug(String slug);

    @Query("""
            select p from BlogPost p
            where p.estado = com.inmobiliaria.corporativo.contenido.BlogPost.Estado.PUBLICADO
              and (:categoria is null or p.categoria = :categoria)
              and (:q is null
                   or lower(p.titulo) like lower(concat('%', :q, '%'))
                   or lower(p.resumen) like lower(concat('%', :q, '%')))
            order by p.publicadoAt desc
            """)
    Page<BlogPost> buscarPublicados(@Param("q") String q, @Param("categoria") String categoria, Pageable pageable);

    @Query("select distinct p.categoria from BlogPost p where p.categoria is not null and p.estado = com.inmobiliaria.corporativo.contenido.BlogPost.Estado.PUBLICADO order by p.categoria")
    List<String> categoriasPublicadas();

    List<BlogPost> findTop3ByEstadoAndCategoriaAndIdNotOrderByPublicadoAtDesc(
            BlogPost.Estado estado, String categoria, Long id);
}
