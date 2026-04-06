import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import UserMenu from '../../components/UserMenu';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import './Propiedades.css';

const MiAgenda = () => {
  const { isAuthenticated } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    ubicacion: ''
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/usuarios/panel/agenda/');
      setEventos(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      await api.post('/usuarios/panel/agenda/', payload);
      setShowModal(false);
      setFormData({
        titulo: '', descripcion: '', fecha_inicio: '', 
        fecha_fin: '', ubicacion: ''
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el evento en la agenda');
    } finally {
      setSaving(false);
    }
  };

  const toggleCompletado = async (evento) => {
    try {
      await api.patch(`/usuarios/panel/agenda/${evento.id}/`, {
        completado: !evento.completado
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteEvento = async (id) => {
    if(!window.confirm('¿Eliminar este evento de la agenda?')) return;
    try {
      await api.delete(`/usuarios/panel/agenda/${id}/`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  // Ordenar eventos: no completados primero, y por fecha
  const eventosOrdenados = [...eventos].sort((a, b) => {
    if(a.completado === b.completado) {
      return new Date(a.fecha_inicio) - new Date(b.fecha_inicio);
    }
    return a.completado ? 1 : -1;
  });

  return (
    <div className="propiedades-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Navbar />
      <UserMenu />

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--color-text)', margin: 0 }}>Mi Agenda</h1>
            <button 
              onClick={() => setShowModal(true)}
              style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              + Nuevo Evento
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Cargando agenda...</div>
          ) : eventosOrdenados.length === 0 ? (
            <div style={{ background: '#fff', padding: '60px 20px', textAlign: 'center', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-bg)', color: 'var(--color-primary)', marginBottom: '16px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <h2 style={{ margin: '0 0 8px 0', color: 'var(--color-text)' }}>Tu agenda está vacía</h2>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Añade eventos, reuniones o recordatorios importantes para gestionarlos aquí.</p>
              <button 
                onClick={() => setShowModal(true)}
                style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Añadir mi primer evento
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {eventosOrdenados.map(evento => (
                <div key={evento.id} style={{ 
                  background: '#fff', 
                  borderRadius: '12px', 
                  padding: '20px', 
                  border: '1px solid var(--color-border)',
                  borderLeft: `4px solid ${evento.completado ? '#10b981' : 'var(--color-primary)'}`,
                  opacity: evento.completado ? 0.6 : 1,
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ paddingTop: '4px' }}>
                    <input 
                      type="checkbox" 
                      checked={evento.completado}
                      onChange={() => toggleCompletado(evento)}
                      style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 8px 0', color: 'var(--color-text)', textDecoration: evento.completado ? 'line-through' : 'none' }}>{evento.titulo}</h3>
                    {evento.descripcion && <p style={{ margin: '0 0 12px 0', color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>{evento.descripcion}</p>}
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        <span>{new Date(evento.fecha_inicio).toLocaleString()}</span>
                      </div>
                      
                      {evento.ubicacion && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                          <span>{evento.ubicacion}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <button 
                      onClick={() => deleteEvento(evento.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', opacity: 0.7 }}
                      title="Eliminar evento"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              ))}
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
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '600px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Añadir Evento</h2>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >&times;</button>
            </div>
            
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <form id="agendaForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Título *</label>
                  <input required type="text" name="titulo" value={formData.titulo} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Ubicación</label>
                  <input type="text" name="ubicacion" value={formData.ubicacion} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Fecha / Hora Inicio *</label>
                    <input required type="datetime-local" name="fecha_inicio" value={formData.fecha_inicio} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Fecha / Hora Fin *</label>
                    <input required type="datetime-local" name="fecha_fin" value={formData.fecha_fin} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
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
                form="agendaForm"
                type="submit"
                disabled={saving}
                style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Guardando...' : 'Guardar Evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiAgenda;
