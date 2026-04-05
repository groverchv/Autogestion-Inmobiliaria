import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import './Home.css';

/**
 * Página de inicio pública.
 */
const Home = () => {
  return (
    <>
      <Navbar />
      <div className="home" id="home-page">
        <section className="home__hero">
          <div className="home__hero-content">
            <h1 className="home__title">
              Gestiona tus propiedades
              <span className="home__title-accent"> de forma inteligente</span>
            </h1>
            <p className="home__description">
              Autogestión Inmobiliaria te permite administrar inmuebles, contratos,
              pagos y usuarios desde una plataforma moderna y segura.
            </p>
            <div className="home__cta">
              <Link to="/propiedades" className="home__btn home__btn--primary">
                Ver Propiedades
              </Link>
              <Link to="/login" className="home__btn home__btn--secondary">
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </section>

        <section className="home__features">
          <div className="home__features-grid">
            <div className="home__feature-card">
              <span className="home__feature-icon"></span>
              <h3>Gestión de Inmuebles</h3>
              <p>Registra y administra propiedades con imágenes, ubicación y detalles completos.</p>
            </div>
            <div className="home__feature-card">
              <span className="home__feature-icon"></span>
              <h3>Contratos Digitales</h3>
              <p>Crea y gestiona contratos de alquiler, venta o anticrético con seguimiento en tiempo real.</p>
            </div>
            <div className="home__feature-card">
              <span className="home__feature-icon"></span>
              <h3>Control de Pagos</h3>
              <p>Registra pagos, genera reportes y mantén un historial completo de transacciones.</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Home;
