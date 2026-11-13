package com.inmobiliaria.corporativo.config;

import com.inmobiliaria.corporativo.seguridad.AdminUsuario;
import com.inmobiliaria.corporativo.seguridad.AdminUsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Crea el usuario administrador inicial si la tabla está vacía.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final AdminUsuarioRepository repo;
    private final PasswordEncoder encoder;
    private final AppProperties props;

    public DataInitializer(AdminUsuarioRepository repo, PasswordEncoder encoder, AppProperties props) {
        this.repo = repo;
        this.encoder = encoder;
        this.props = props;
    }

    @Override
    public void run(String... args) {
        if (repo.count() == 0) {
            AdminUsuario admin = new AdminUsuario();
            admin.setEmail(props.getAdmin().getEmail());
            admin.setPasswordHash(encoder.encode(props.getAdmin().getPassword()));
            admin.setNombre(props.getAdmin().getNombre());
            admin.setRol(AdminUsuario.Rol.ADMIN);
            repo.save(admin);
            log.info("Usuario administrador inicial creado: {}", admin.getEmail());
        }
    }
}
