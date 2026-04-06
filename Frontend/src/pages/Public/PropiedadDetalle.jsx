import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

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
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null);
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

  const principalMedia = inmueble?.multimedia?.find(m => m.es_principal) || inmueble?.multimedia?.[0];
  const restoMedia = inmueble?.multimedia?.filter(m => m.id !== principalMedia?.id) || [];
  const allMedia = principalMedia ? [principalMedia, ...restoMedia] : restoMedia;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedMediaIndex === null) return;
      if (e.key === 'ArrowRight') {
        setSelectedMediaIndex(prev => (prev < allMedia.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setSelectedMediaIndex(prev => (prev > 0 ? prev - 1 : allMedia.length - 1));
      } else if (e.key === 'Escape') {
        setSelectedMediaIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMediaIndex, allMedia.length]);

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
            {principalMedia ? (
              principalMedia.tipo === 'video' ? (
                <video src={principalMedia.archivo} controls style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setSelectedMediaIndex(0)} />
              ) : (
                <img src={principalMedia.archivo} alt={inmueble.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setSelectedMediaIndex(0)} />
              )
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

            {inmueble.gps && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>Ubicación</h2>
                <div style={{ height: '350px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                  {(() => {
                    const parts = inmueble.gps.split(',');
                    const lat = parseFloat(parts[0]);
                    const lng = parseFloat(parts[1]);
                    if (isNaN(lat) || isNaN(lng)) return <div style={{ padding: '16px', color: 'var(--color-text-secondary)' }}>Ubicación inválida</div>;
                    
                    return (
                      <MapContainer center={[lat, lng]} zoom={15} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[lat, lng]} />
                      </MapContainer>
                    );
                  })()}
                </div>
                <div style={{ marginTop: '16px', textAlign: 'right' }}>
                  <a href={`https://www.google.com/maps?q=${inmueble.gps.replace(' ', '')}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: 'var(--color-bg)', padding: '10px 20px', borderRadius: '8px', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    Ver en Google Maps
                  </a>
                </div>
              </div>
            )}

            {restoMedia.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>Galería</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                  {allMedia.map((media, originalIndex) => (
                    <div 
                      key={media.id} 
                      onClick={() => media.tipo !== 'video' && setSelectedMediaIndex(originalIndex)}
                      style={{ height: '150px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-bg)', cursor: media.tipo !== 'video' ? 'pointer' : 'default', transition: 'transform 0.2s ease', position: 'relative' }}
                      onMouseEnter={(e) => { if(media.tipo !== 'video') e.currentTarget.style.transform = 'scale(1.02)' }}
                      onMouseLeave={(e) => { if(media.tipo !== 'video') e.currentTarget.style.transform = 'scale(1)' }}
                    >
                      {media.tipo === 'video' ? (
                        <video src={media.archivo} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <img src={media.archivo} alt={`${inmueble.titulo} vista`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      
                      {media.tipo !== 'video' && (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', background: 'rgba(0,0,0,0)', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <svg className="zoom-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ opacity: 0, transition: 'opacity 0.2s', dropShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            <line x1="11" y1="8" x2="11" y2="14"></line>
                            <line x1="8" y1="11" x2="14" y2="11"></line>
                           </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '24px' }}>
              <button onClick={handleContactar} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }}>
                Contactar al Agente
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {selectedMediaIndex !== null && (
        <div 
          onClick={() => setSelectedMediaIndex(null)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.92)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '40px', cursor: 'zoom-out', backdropFilter: 'blur(5px)'
          }}
        >
          {allMedia.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedMediaIndex(prev => (prev > 0 ? prev - 1 : allMedia.length - 1)); }}
              style={{ position: 'absolute', left: '24px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '2rem', cursor: 'pointer', padding: '16px', borderRadius: '50%', backdropFilter: 'blur(4px)', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            >
              &#10094;
            </button>
          )}

          {allMedia[selectedMediaIndex]?.tipo === 'video' ? (
             <video 
              src={allMedia[selectedMediaIndex].archivo} controls autoPlay
              style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} 
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img 
              src={allMedia[selectedMediaIndex]?.archivo} 
              alt="Fullscreen media" 
              style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} 
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {allMedia.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedMediaIndex(prev => (prev < allMedia.length - 1 ? prev + 1 : 0)); }}
              style={{ position: 'absolute', right: '24px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '2rem', cursor: 'pointer', padding: '16px', borderRadius: '50%', backdropFilter: 'blur(4px)', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.4)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            >
              &#10095;
            </button>
          )}

          <div style={{ position: 'absolute', bottom: '24px', color: '#fff', fontSize: '1rem', background: 'rgba(0,0,0,0.5)', padding: '6px 16px', borderRadius: '20px' }}>
            {selectedMediaIndex + 1} / {allMedia.length}
          </div>

          <button 
            onClick={() => setSelectedMediaIndex(null)}
            style={{ position: 'absolute', top: '24px', right: '32px', background: 'none', border: 'none', color: '#fff', fontSize: '3rem', cursor: 'pointer', opacity: 0.8, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
          >&times;</button>
        </div>
      )}
    </div>
  );
};

export default PropiedadDetalle;
