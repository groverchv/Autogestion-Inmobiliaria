import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import UserMenu from '../../components/UserMenu';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import './Propiedades.css';

const PropiedadDetalle = () => {
  const { id } = useParams();
  const [inmueble, setInmueble] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/inmuebles/lista/${id}/`)
      .then(res => setInmueble(res.data))
      .catch(err => {
        console.error(err);
        setError('No se pudo cargar la información del inmueble.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleContactar = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // Solo dirigimos a mensajes y pasamos parámetros por si se necesita crear el chat al mandar un msj
    navigate(`/mensajes?inmuebleId=${inmueble.id}&propietarioId=${inmueble.propietario}&propietarioNombre=${encodeURIComponent(inmueble.propietario_nombre)}&inmuebleTitulo=${encodeURIComponent(inmueble.titulo)}`);
  };

  const estadoColors = {
    disponible: { bg: '#dcfce7', color: '#15803d' },
    ocupado: { bg: '#fee2e2', color: '#dc2626' },
    mantenimiento: { bg: '#fef3c7', color: '#d97706' },
    reservado: { bg: '#dbeafe', color: '#2563eb' },
  };

  if (loading) {
    return (
      <div className="propiedades-page">
        <Navbar />
        <div className="propiedades-loading">Cargando detalles del inmueble...</div>
      </div>
    );
  }

  if (error || !inmueble) {
    return (
      <div className="propiedades-page">
        <Navbar />
        <div className="propiedades-empty">
          <p>{error || 'Inmueble no encontrado.'}</p>
          <Link to="/propiedades" className="propiedad-card__cta" style={{ display: 'inline-block', marginTop: '16px' }}>Volver al catálogo</Link>
        </div>
      </div>
    );
  }

  const estadoStyle = estadoColors[inmueble.estado] || estadoColors.disponible;

  return (
    <div className="propiedades-page">
      <Navbar />

      {isAuthenticated && user?.rol !== 'admin' && (
        <UserMenu />
      )}

      <div className="propiedades-content" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Link to="/propiedades" style={{ display: 'inline-block', marginBottom: '20px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}>
          &larr; Volver al catálogo
        </Link>
        
        <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ height: '400px', background: 'linear-gradient(135deg, #e0f2fe, #f0f9ff)', position: 'relative' }}>
            {inmueble.imagen_principal ? (
              <img src={inmueble.imagen_principal} alt={inmueble.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-primary)', opacity: 0.4 }}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
            )}
            <span style={{ position: 'absolute', top: '24px', left: '24px', background: estadoStyle.bg, color: estadoStyle.color, padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
              {inmueble.estado}
            </span>
            {inmueble.tipo_nombre && (
              <span style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.9)', color: 'var(--color-text-secondary)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                {inmueble.tipo_nombre}
              </span>
            )}
          </div>

          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '8px' }}>{inmueble.titulo}</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>
                  {inmueble.direccion} - {inmueble.zona && `${inmueble.zona}, `}{inmueble.ciudad}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  Bs. {parseFloat(inmueble.precio).toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px', background: 'var(--color-bg)', padding: '24px', borderRadius: '12px' }}>
              {inmueble.habitaciones > 0 && (
                <div>
                  <strong style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Habitaciones</strong>
                  <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-text)' }}>{inmueble.habitaciones}</span>
                </div>
              )}
              {inmueble.banos > 0 && (
                <div>
                  <strong style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Baños</strong>
                  <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-text)' }}>{inmueble.banos}</span>
                </div>
              )}
              {inmueble.superficie > 0 && (
                <div>
                  <strong style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '4px' }}>Superficie (m²)</strong>
                  <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-text)' }}>{inmueble.superficie}</span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>Descripción</h2>
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{inmueble.descripcion}</p>
            </div>

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '24px' }}>
              <button onClick={handleContactar} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }}>
                Contactar al Agente
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropiedadDetalle;
