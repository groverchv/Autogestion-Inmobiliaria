import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import UserMenu from '../../components/UserMenu';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import './Propiedades.css';

const MisInmuebles = () => {
  const { isAuthenticated } = useAuth();
  
  const [inmuebles, setInmuebles] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    tipo: '',
    direccion: '',
    ciudad: '',
    zona: '',
    precio: '',
    superficie: '',
    habitaciones: 0,
    banos: 0,
    garaje: false,
    estado: 'disponible'
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inmRes, tipRes] = await Promise.all([
        api.get('/inmuebles/panel/lista/'),
        api.get('/inmuebles/tipos/')
      ]);
      setInmuebles(inmRes.data.results || inmRes.data);
      setTipos(tipRes.data.results || tipRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.superficie) payload.superficie = null; // manejar nulls recomendados
      
      await api.post('/inmuebles/panel/lista/', payload);
      setShowModal(false);
      setFormData({
        titulo: '', descripcion: '', tipo: tipos.length > 0 ? tipos[0].id : '', 
        direccion: '', ciudad: '', zona: '', precio: '', superficie: '', 
        habitaciones: 0, banos: 0, garaje: false, estado: 'disponible'
      });
      fetchData(); // Recargar
    } catch (err) {
      console.error(err);
      alert('Error al registrar inmueble');
    } finally {
      setSaving(false);
    }
  };

  const estadoColors = {
    disponible: { bg: '#dcfce7', color: '#15803d' },
    ocupado: { bg: '#fee2e2', color: '#dc2626' },
    mantenimiento: { bg: '#fef3c7', color: '#d97706' },
    reservado: { bg: '#dbeafe', color: '#2563eb' },
  };

  return (
    <div className="propiedades-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Navbar />
      <UserMenu />

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--color-text)', margin: 0 }}>Mis Inmuebles</h1>
            <button 
              onClick={() => {
                if(tipos.length > 0 && !formData.tipo) setFormData(p => ({...p, tipo: tipos[0].id}));
                setShowModal(true);
              }}
              style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              + Registrar Inmueble
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Cargando tus inmuebles...</div>
          ) : inmuebles.length === 0 ? (
            <div style={{ background: '#fff', padding: '60px 20px', textAlign: 'center', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-bg)', color: 'var(--color-primary)', marginBottom: '16px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                </svg>
              </div>
              <h2 style={{ margin: '0 0 8px 0', color: 'var(--color-text)' }}>No tienes inmuebles registrados</h2>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Tus propiedades publicadas aparecerán aquí y en el catálogo público.</p>
              <button 
                onClick={() => {
                  if(tipos.length > 0 && !formData.tipo) setFormData(p => ({...p, tipo: tipos[0].id}));
                  setShowModal(true);
                }}
                style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Registrar mi primer Inmueble
              </button>
            </div>
          ) : (
            <div className="propiedades-grid">
              {inmuebles.map(inm => {
                const estadoStyle = estadoColors[inm.estado] || estadoColors.disponible;
                return (
                  <div key={inm.id} className="propiedad-card">
                    <div className="propiedad-card__image" style={{ height: '200px' }}>
                      {inm.imagen_principal ? (
                        <img src={inm.imagen_principal} alt={inm.titulo} />
                      ) : (
                        <div className="propiedad-card__placeholder">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        </div>
                      )}
                      <span className="propiedad-card__badge" style={{ background: estadoStyle.bg, color: estadoStyle.color }}>
                        {inm.estado}
                      </span>
                    </div>
                    <div className="propiedad-card__body">
                      <h3 className="propiedad-card__title">{inm.titulo}</h3>
                      <p className="propiedad-card__location">{inm.ciudad}{inm.zona ? `, ${inm.zona}` : ''}</p>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                        <span className="propiedad-card__price">Bs. {parseFloat(inm.precio).toLocaleString()}</span>
                        <Link to={`/propiedades/${inm.id}`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>Ver públicamente</Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '700px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Registrar Inmueble</h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >&times;</button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <form id="inmuebleForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Título *</label>
                    <input required type="text" name="titulo" value={formData.titulo} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Tipo *</label>
                    <select required name="tipo" value={formData.tipo} onChange={handleChange} className="propiedades-filter__select" style={{ width: '100%' }}>
                      {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Ciudad *</label>
                    <input required type="text" name="ciudad" value={formData.ciudad} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Zona</label>
                    <input type="text" name="zona" value={formData.zona} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Dirección Exacta *</label>
                  <input required type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Precio (Bs) *</label>
                    <input required type="number" step="0.01" name="precio" value={formData.precio} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Superficie (m²)</label>
                    <input type="number" step="0.01" name="superficie" value={formData.superficie} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Habitaciones</label>
                    <input type="number" name="habitaciones" value={formData.habitaciones} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Baños</label>
                    <input type="number" name="banos" value={formData.banos} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" name="garaje" checked={formData.garaje} onChange={handleChange} />
                      Tiene Garaje
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Descripción</label>
                  <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows="4" className="propiedades-filter__input" style={{ width: '100%', resize: 'vertical' }}></textarea>
                </div>
              </form>
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--color-bg)' }}>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', color: 'var(--color-text-secondary)', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                form="inmuebleForm"
                type="submit"
                disabled={saving}
                style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Guardando...' : 'Publicar Inmueble'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MisInmuebles;
