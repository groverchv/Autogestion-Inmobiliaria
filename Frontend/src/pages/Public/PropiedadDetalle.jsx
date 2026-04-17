import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Heart, Share2, MapPin, Bed, Bath, Maximize2, X, ChevronLeft, 
  ChevronRight, Home, Video, MessageCircle, Check, AlertCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import ResenaSection from '../../components/ResenaSection';

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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
    
    if (user?.rol === 'admin') {
      setShowConfirmModal(true);
      return;
    }

    // Flujo normal de usuario - navega a mensajes con el propietario
    navigate(`/mensajes?inmuebleId=${inmueble.id}&propietarioId=${inmueble.propietario}&inmuebleTitulo=${encodeURIComponent(inmueble.titulo)}`);
  };

  const confirmAdminContact = async () => {
    // Aquí el admin confirma que ya habló con el usuario
    try {
      // Opcional: Registrar la interacción en el backend
      // await api.post('/usuarios/notificaciones/', { ... });
      setShowConfirmModal(false);
      navigate(`/mensajes?inmuebleId=${inmueble.id}&propietarioId=${inmueble.propietario}`);
    } catch (err) {
      console.error(err);
    }
  };

  const shareWhatsApp = () => {
    const text = `Mira este inmueble: ${inmueble.titulo} - Bs. ${inmueble.precio}. ${window.location.href}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const estadoColors = {
    disponible: { bg: '#dcfce7', color: '#15803d' },
    ocupado: { bg: '#fee2e2', color: '#dc2626' },
    mantenimiento: { bg: '#fef3c7', color: '#d97706' },
    reservado: { bg: '#dbeafe', color: '#2563eb' },
  };

  const principalMedia = inmueble?.multimedia?.find(m => m.principal) || inmueble?.multimedia?.[0];
  const restoMedia = inmueble?.multimedia?.filter(m => m.id !== principalMedia?.id) || [];
  const allMedia = principalMedia ? [principalMedia, ...restoMedia] : restoMedia;
  const thumbMedia = restoMedia.slice(0, 3);

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
        <Link to="/propiedades" style={{ display: 'inline-block', marginBottom: '20px', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChevronLeft size={18} /> Volver al catálogo
        </Link>
        
        <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', gap: '12px', background: 'linear-gradient(135deg, #e0f2fe, #f0f9ff)', borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
            {/* Imagen Principal */}
            <div style={{ flex: 1, height: '400px', position: 'relative', background: '#f0f9ff' }}>
              {principalMedia ? (
                principalMedia.tipo === 'video' ? (
                  <video src={principalMedia.archivo} controls style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setSelectedMediaIndex(0)} />
                ) : (
                  <img src={principalMedia.archivo} alt={inmueble.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setSelectedMediaIndex(0)} />
                )
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-primary)', opacity: 0.4 }}>
                  <Home size={80} strokeWidth={1.5} />
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
            
            {/* Galería de Miniaturas */}
            {thumbMedia.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', width: '120px', minWidth: '120px', background: 'rgba(255,255,255,0.5)' }}>
                {thumbMedia.map((media, idx) => (
                  <div
                    key={media.id}
                    onClick={() => setSelectedMediaIndex(idx + 1)}
                    style={{
                      width: '100%',
                      height: '100px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: selectedMediaIndex === idx + 1 ? '2px solid var(--color-primary)' : '1px solid rgba(0,0,0,0.1)',
                      transition: 'all 0.2s',
                      background: '#f0f9ff'
                    }}
                  >
                    {media.tipo === 'video' ? (
                      <video src={media.archivo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <img src={media.archivo} alt={`Thumbnail ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '8px' }}>{inmueble.titulo}</h1>
                <p style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>
                  <MapPin size={18} /> {inmueble.direccion?.calle} - {inmueble.direccion?.zona && `${inmueble.direccion.zona}, `}{inmueble.direccion?.ciudad}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#fff', padding: '8px', borderRadius: '10px', color: 'var(--color-primary)' }}><Bed size={20}/></div>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '2px' }}>Habitaciones</strong>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)' }}>{inmueble.habitaciones}</span>
                  </div>
                </div>
              )}
              {inmueble.banos > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#fff', padding: '8px', borderRadius: '10px', color: 'var(--color-primary)' }}><Bath size={20}/></div>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '2px' }}>Baños</strong>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)' }}>{inmueble.banos}</span>
                  </div>
                </div>
              )}
              {inmueble.superficie > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#fff', padding: '8px', borderRadius: '10px', color: 'var(--color-primary)' }}><Maximize2 size={20}/></div>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '2px' }}>Superficie</strong>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)' }}>{inmueble.superficie} m²</span>
                  </div>
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
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '24px', flexWrap: 'wrap' }}>
              <button onClick={handleContactar} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: '10px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={18} /> Contactar Dueño
              </button>
            </div>

            <ResenaSection inmuebleId={id} isAuthenticated={isAuthenticated} userId={user?.id} />
          </div>
        </div>
      </div>
      
      {/* Modal de Confirmación para Admin */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e0f2fe', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <AlertCircle size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: '#1e293b' }}>Confirmación de contacto</h3>
            <p style={{ color: '#64748b', marginBottom: '28px', lineHeight: '1.5' }}>¿Ya habló con el usuario sobre este inmueble?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmAdminContact}
                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '12px', background: '#0ea5e9', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Check size={18} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

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
            >
              <ChevronLeft size={32} />
            </button>
          )}

          {allMedia[selectedMediaIndex]?.tipo === 'video' ? (
             <video 
              src={allMedia[selectedMediaIndex].archivo} controls autoPlay
              style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px' }} 
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img 
              src={allMedia[selectedMediaIndex]?.archivo} 
              alt="Fullscreen media" 
              style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px' }} 
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {allMedia.length > 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedMediaIndex(prev => (prev < allMedia.length - 1 ? prev + 1 : 0)); }}
              style={{ position: 'absolute', right: '24px', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: '2rem', cursor: 'pointer', padding: '16px', borderRadius: '50%', backdropFilter: 'blur(4px)', transition: 'background 0.2s' }}
            >
              <ChevronRight size={32} />
            </button>
          )}

          <button 
            onClick={() => setSelectedMediaIndex(null)}
            style={{ position: 'absolute', top: '24px', right: '32px', background: 'none', border: 'none', color: '#fff', fontSize: '3rem', cursor: 'pointer' }}
          ><X size={48} /></button>
        </div>
      )}
    </div>
  );
};

export default PropiedadDetalle;
