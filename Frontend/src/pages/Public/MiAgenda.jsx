import { useState, useEffect } from 'react';
import {
  Calendar, Clock, MapPin, CheckCircle,
  XCircle, AlertCircle, Trash2,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import UserMenu from '../../components/UserMenu';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import './Propiedades.css';

const ESTADO_CITA_CONFIG = {
  pendiente: { bg: '#fef3c7', color: '#92400e', label: 'Pendiente' },
  confirmada: { bg: '#dcfce7', color: '#166534', label: 'Confirmada' },
  cancelada: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelada' },
  completada: { bg: '#e0f2fe', color: '#075985', label: 'Completada' },
};

const MiAgenda = () => {
  const { isAuthenticated, user } = useAuth();
  const [tab, setTab] = useState('eventos');
  const [eventos, setEventos] = useState([]);
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '', descripcion: '', fecha_inicio: '', fecha_fin: '', ubicacion: '',
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchTodo();
  }, [isAuthenticated]);

  const fetchTodo = async () => {
    setLoading(true);
    try {
      const [evRes, citaRes] = await Promise.all([
        api.get('/usuarios/panel/agenda/').catch(() => ({ data: [] })),
        api.get('/inmuebles/citas/mis-citas-agenda/').catch(() => ({ data: [] })),
      ]);
      setEventos(evRes.data.results || evRes.data || []);
      setCitas(Array.isArray(citaRes.data) ? citaRes.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitEvento = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/usuarios/panel/agenda/', { ...formData });
      setShowModal(false);
      setFormData({ titulo: '', descripcion: '', fecha_inicio: '', fecha_fin: '', ubicacion: '' });
      fetchTodo();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el evento en la agenda');
    } finally {
      setSaving(false);
    }
  };

  const toggleCompletado = async (evento) => {
    try {
      await api.patch(`/usuarios/panel/agenda/${evento.id}/`, { completado: !evento.completado });
      fetchTodo();
    } catch (err) { console.error(err); }
  };

  const deleteEvento = async (id) => {
    if (!window.confirm('¿Eliminar este evento?')) return;
    try {
      await api.delete(`/usuarios/panel/agenda/${id}/`);
      fetchTodo();
    } catch (err) { console.error(err); }
  };

  const cambiarEstadoCita = async (citaId, nuevoEstado) => {
    try {
      await api.patch(`/inmuebles/citas/${citaId}/cambiar-estado/`, { estado: nuevoEstado });
      fetchTodo();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al actualizar la cita');
    }
  };

  const soyPropietario = (cita) => cita.propietario === user?.id;

  // Ordenar eventos: pendientes primero
  const eventosOrdenados = [...eventos].sort((a, b) => {
    if (a.completado === b.completado)
      return new Date(a.fecha_inicio) - new Date(b.fecha_inicio);
    return a.completado ? 1 : -1;
  });

  const ahora = new Date();
  const citasFuturas = citas.filter(c => {
    const f = new Date(`${c.fecha}T${c.hora_inicio}`);
    return f >= ahora && c.estado !== 'cancelada';
  });
  const citasPasadas = citas.filter(c => {
    const f = new Date(`${c.fecha}T${c.hora_inicio}`);
    return f < ahora || c.estado === 'cancelada';
  });

  return (
    <div className="propiedades-page"
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Navbar />
      <UserMenu />

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          {/* ── Tabs ───────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', gap: '12px', marginBottom: '24px',
            alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { key: 'eventos', label: 'Mis Eventos', icon: <Calendar size={16} />, count: eventosOrdenados.filter(e => !e.completado).length },
                { key: 'citas', label: 'Mis Citas', icon: <Clock size={16} />, count: citasFuturas.length },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{
                    padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    background: tab === t.key ? '#0ea5e9' : '#f1f5f9',
                    color: tab === t.key ? '#fff' : '#64748b',
                    fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                  {t.icon} {t.label}
                  {t.count > 0 && (
                    <span style={{
                      background: tab === t.key ? 'rgba(255,255,255,0.3)' : '#0ea5e9',
                      color: '#fff', borderRadius: '10px', padding: '0 6px',
                      fontSize: '0.75rem', fontWeight: 700,
                    }}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {tab === 'eventos' && (
              <button onClick={() => setShowModal(true)}
                style={{
                  background: '#0ea5e9', color: '#fff', border: 'none',
                  padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                }}>
                + Nuevo Evento
              </button>
            )}
          </div>

          {/* ── Contenido ──────────────────────────────────────────── */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              Cargando...
            </div>
          ) : tab === 'eventos' ? (

            /* ── TAB: EVENTOS ──────────────────────────────────────── */
            eventosOrdenados.length === 0 ? (
              <div style={{
                background: '#fff', padding: '60px 20px', textAlign: 'center',
                borderRadius: '16px', border: '1px solid var(--color-border)',
              }}>
                <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>Tu agenda está vacía</h2>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>
                  Añade eventos, reuniones o recordatorios importantes.
                </p>
                <button onClick={() => setShowModal(true)}
                  style={{
                    background: '#0ea5e9', color: '#fff', border: 'none',
                    padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                  }}>
                  Añadir mi primer evento
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {eventosOrdenados.map(evento => (
                  <div key={evento.id} style={{
                    background: '#fff', borderRadius: '12px', padding: '20px',
                    border: '1px solid var(--color-border)',
                    borderLeft: `4px solid ${evento.completado ? '#10b981' : '#0ea5e9'}`,
                    opacity: evento.completado ? 0.6 : 1,
                    display: 'flex', gap: '16px', alignItems: 'flex-start',
                  }}>
                    <input type="checkbox" checked={evento.completado}
                      onChange={() => toggleCompletado(evento)}
                      style={{ transform: 'scale(1.5)', cursor: 'pointer', marginTop: '4px' }} />
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        margin: '0 0 8px', color: '#1e293b',
                        textDecoration: evento.completado ? 'line-through' : 'none',
                      }}>
                        {evento.titulo}
                      </h3>
                      {evento.descripcion && (
                        <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: '0.95rem' }}>
                          {evento.descripcion}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={14} />
                          {new Date(evento.fecha_inicio).toLocaleString('es-BO')}
                        </span>
                        {evento.ubicacion && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={14} /> {evento.ubicacion}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => deleteEvento(evento.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )

          ) : (

            /* ── TAB: CITAS ────────────────────────────────────────── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {citas.length === 0 ? (
                <div style={{
                  background: '#fff', padding: '60px 20px', textAlign: 'center',
                  borderRadius: '16px', border: '1px solid var(--color-border)',
                }}>
                  <Clock size={48} color="#cbd5e1" style={{ margin: '0 auto 16px', display: 'block' }} />
                  <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>
                    No tienes citas agendadas
                  </h2>
                  <p style={{ color: '#64748b' }}>
                    Ve al catálogo de propiedades y agenda una visita.
                  </p>
                </div>
              ) : (
                <>
                  {/* Citas próximas */}
                  {citasFuturas.length > 0 && (
                    <div>
                      <h3 style={{
                        color: '#1e293b', marginBottom: '16px', fontSize: '1rem',
                        fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                        <AlertCircle size={18} color="#0ea5e9" />
                        Citas próximas ({citasFuturas.length})
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {citasFuturas.map(cita => {
                          const cfg = ESTADO_CITA_CONFIG[cita.estado] || ESTADO_CITA_CONFIG.pendiente;
                          const esProp = soyPropietario(cita);
                          return (
                            <div key={cita.id} style={{
                              background: '#fff', borderRadius: '12px', padding: '20px',
                              border: '1px solid #e2e8f0',
                              borderLeft: `4px solid ${cita.estado === 'confirmada' ? '#10b981' : '#0ea5e9'}`,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                            }}>
                              <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px',
                              }}>
                                <div style={{ flex: 1 }}>
                                  {/* Título + badges */}
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    marginBottom: '8px', flexWrap: 'wrap',
                                  }}>
                                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>
                                      {cita.inmueble_titulo}
                                    </span>
                                    <span style={{
                                      background: cfg.bg, color: cfg.color,
                                      padding: '2px 10px', borderRadius: '20px',
                                      fontSize: '0.75rem', fontWeight: 600,
                                    }}>
                                      {cfg.label}
                                    </span>
                                    <span style={{
                                      background: esProp ? '#ede9fe' : '#e0f2fe',
                                      color: esProp ? '#7c3aed' : '#0284c7',
                                      padding: '2px 10px', borderRadius: '20px',
                                      fontSize: '0.7rem', fontWeight: 600,
                                    }}>
                                      {esProp ? 'Soy propietario' : 'Soy cliente'}
                                    </span>
                                  </div>

                                  {/* Fecha y hora */}
                                  <div style={{
                                    display: 'flex', gap: '20px', fontSize: '0.9rem',
                                    color: '#64748b', flexWrap: 'wrap',
                                  }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <Calendar size={15} color="#0ea5e9" />
                                      {new Date(cita.fecha + 'T00:00:00').toLocaleDateString('es-BO', {
                                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                                      })}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <Clock size={15} color="#0ea5e9" />
                                      {cita.hora_inicio?.slice(0, 5)} — {cita.hora_fin?.slice(0, 5)}
                                    </span>
                                  </div>

                                  {/* Contraparte */}
                                  <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
                                    {esProp
                                      ? `Cliente: ${cita.cliente_nombre}`
                                      : `Propietario: ${cita.propietario_nombre}`}
                                  </div>

                                  {/* Notas */}
                                  {cita.notas && (
                                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#475569', fontStyle: 'italic' }}>
                                      "{cita.notas}"
                                    </div>
                                  )}
                                </div>

                                {/* Acciones */}
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                                  {esProp && cita.estado === 'pendiente' && (
                                    <button onClick={() => cambiarEstadoCita(cita.id, 'confirmada')}
                                      style={{
                                        background: '#dcfce7', color: '#166534', border: 'none',
                                        borderRadius: '8px', padding: '8px 14px', cursor: 'pointer',
                                        fontWeight: 600, fontSize: '0.85rem',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                      }}>
                                      <CheckCircle size={15} /> Confirmar
                                    </button>
                                  )}
                                  {esProp && cita.estado === 'confirmada' && (
                                    <button onClick={() => cambiarEstadoCita(cita.id, 'completada')}
                                      style={{
                                        background: '#e0f2fe', color: '#075985', border: 'none',
                                        borderRadius: '8px', padding: '8px 14px', cursor: 'pointer',
                                        fontWeight: 600, fontSize: '0.85rem',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                      }}>
                                      <CheckCircle size={15} /> Completada
                                    </button>
                                  )}
                                  {(cita.estado === 'pendiente' || cita.estado === 'confirmada') && (
                                    <button onClick={() => cambiarEstadoCita(cita.id, 'cancelada')}
                                      style={{
                                        background: '#fee2e2', color: '#dc2626', border: 'none',
                                        borderRadius: '8px', padding: '8px 14px', cursor: 'pointer',
                                        fontWeight: 600, fontSize: '0.85rem',
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                      }}>
                                      <XCircle size={15} /> Cancelar
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Historial de citas */}
                  {citasPasadas.length > 0 && (
                    <div>
                      <h3 style={{
                        color: '#94a3b8', marginBottom: '16px',
                        fontSize: '0.95rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                        Historial ({citasPasadas.length})
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {citasPasadas.map(cita => {
                          const cfg = ESTADO_CITA_CONFIG[cita.estado] || ESTADO_CITA_CONFIG.cancelada;
                          const esProp = soyPropietario(cita);
                          return (
                            <div key={cita.id} style={{
                              background: '#f8fafc', borderRadius: '10px', padding: '14px 16px',
                              border: '1px solid #e2e8f0', opacity: 0.8,
                            }}>
                              <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', flexWrap: 'wrap', gap: '8px',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, color: '#475569' }}>
                                    {cita.inmueble_titulo}
                                  </span>
                                  <span style={{
                                    background: cfg.bg, color: cfg.color,
                                    padding: '2px 8px', borderRadius: '12px',
                                    fontSize: '0.72rem', fontWeight: 600,
                                  }}>
                                    {cfg.label}
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                  {new Date(cita.fecha + 'T00:00:00').toLocaleDateString('es-BO')}
                                  {' · '}{cita.hora_inicio?.slice(0, 5)}
                                  {' · '}{esProp ? `Cliente: ${cita.cliente_nombre}` : `Prop.: ${cita.propietario_nombre}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal nuevo evento ─────────────────────────────────────── */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '600px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Añadir Evento</h2>
              <button onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>
                &times;
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <form id="agendaForm" onSubmit={handleSubmitEvento}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#64748b' }}>
                    Título *
                  </label>
                  <input required type="text" name="titulo" value={formData.titulo}
                    onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#64748b' }}>
                    Ubicación
                  </label>
                  <input type="text" name="ubicacion" value={formData.ubicacion}
                    onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#64748b' }}>
                      Fecha / Hora Inicio *
                    </label>
                    <input required type="datetime-local" name="fecha_inicio" value={formData.fecha_inicio}
                      onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#64748b' }}>
                      Fecha / Hora Fin *
                    </label>
                    <input required type="datetime-local" name="fecha_fin" value={formData.fecha_fin}
                      onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#64748b' }}>
                    Descripción
                  </label>
                  <textarea name="descripcion" value={formData.descripcion} onChange={handleChange}
                    rows="4" className="propiedades-filter__input"
                    style={{ width: '100%', resize: 'vertical' }} />
                </div>
              </form>
            </div>

            <div style={{
              padding: '16px 24px', borderTop: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc',
            }}>
              <button onClick={() => setShowModal(false)}
                style={{ background: 'transparent', color: '#64748b', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button form="agendaForm" type="submit" disabled={saving}
                style={{
                  background: '#0ea5e9', color: '#fff', border: 'none',
                  padding: '10px 24px', borderRadius: '8px', fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                }}>
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