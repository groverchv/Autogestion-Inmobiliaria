import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import Stepper from './Stepper';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ModalAgendarCita = ({ isOpen, onClose, inmueble, propietarioId, onCitaAgendada }) => {
  const hoy = new Date();
  const [mesVista, setMesVista]               = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [slots, setSlots]                     = useState([]);
  const [slotSeleccionado, setSlotSeleccionado] = useState(null);
  const [notas, setNotas]                     = useState('');
  const [cargandoSlots, setCargandoSlots]     = useState(false);
  const [guardando, setGuardando]             = useState(false);
  const [error, setError]                     = useState('');
  const [exito, setExito]                     = useState(false);
  const [paso, setPaso]                       = useState(1);

  // Resetear al cerrar
  useEffect(() => {
    if (!isOpen) {
      setFechaSeleccionada(null);
      setSlots([]);
      setSlotSeleccionado(null);
      setNotas('');
      setError('');
      setExito(false);
      setPaso(1);
      setMesVista(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    }
  }, [isOpen]);

  // Escape cierra el modal (accesibilidad)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Cargar slots al seleccionar fecha
  useEffect(() => {
    if (!fechaSeleccionada || !inmueble?.id || !propietarioId) return;
    setCargandoSlots(true);
    setSlotSeleccionado(null);
    setSlots([]);
    setError('');

    api.get('/inmuebles/horarios/slots-disponibles/', {
      params: {
        inmueble_id:    inmueble.id,
        fecha:          fechaSeleccionada.toISOString().split('T')[0],
        propietario_id: propietarioId,
      },
    })
      .then(res => {
        const s = res.data.slots || [];
        setSlots(s);
        if (!s.length) setError(res.data.mensaje || 'No hay horarios disponibles para este día.');
      })
      .catch(() => setError('Error al cargar los horarios disponibles.'))
      .finally(() => setCargandoSlots(false));
  }, [fechaSeleccionada, inmueble?.id, propietarioId]);

  // ── Helpers de calendario ──────────────────────────────────────────────────
  const getDiasDelMes = () => {
    const año      = mesVista.getFullYear();
    const mes      = mesVista.getMonth();
    const primerDia = new Date(año, mes, 1).getDay();
    const ultimoDia = new Date(año, mes + 1, 0).getDate();
    const dias = [];
    for (let i = 0; i < primerDia; i++) dias.push(null);
    for (let d = 1; d <= ultimoDia; d++) dias.push(new Date(año, mes, d));
    return dias;
  };

  const esFechaPasada = (fecha) => {
    if (!fecha) return true;
    const h = new Date(); h.setHours(0, 0, 0, 0);
    return fecha < h;
  };

  const esFechaSeleccionada = (fecha) =>
    fecha && fechaSeleccionada &&
    fecha.toDateString() === fechaSeleccionada.toDateString();

  const irMesAnterior = () => {
    setMesVista(new Date(mesVista.getFullYear(), mesVista.getMonth() - 1, 1));
    setFechaSeleccionada(null); setSlots([]); setError('');
  };
  const irMesSiguiente = () => {
    setMesVista(new Date(mesVista.getFullYear(), mesVista.getMonth() + 1, 1));
    setFechaSeleccionada(null); setSlots([]); setError('');
  };

  // ── Confirmar cita ─────────────────────────────────────────────────────────
  const handleAgendar = async () => {
    if (!fechaSeleccionada || !slotSeleccionado) {
      setError('Selecciona una fecha y un horario.'); return;
    }
    setGuardando(true); setError('');
    try {
      await api.post('/inmuebles/citas/', {
        inmueble:    inmueble.id,
        fecha:       fechaSeleccionada.toISOString().split('T')[0],
        hora_inicio: slotSeleccionado.hora_inicio + ':00',
        notas,
      });
      setExito(true);
      if (onCitaAgendada) onCitaAgendada();
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.hora_inicio?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        'Error al agendar la cita. Intenta de nuevo.';
      setError(msg);
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;
  const dias = getDiasDelMes();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)',
        backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999, padding: '20px',
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={{
          background: 'var(--color-surface)', borderRadius: '20px', width: '100%',
          maxWidth: '560px', maxHeight: '90vh', overflow: 'auto',
          boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cita-modal-titulo"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <h2 id="cita-modal-titulo" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Pedir visita
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              {inmueble?.titulo}
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar diálogo"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}>
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        {/* ── Pantalla de éxito ───────────────────────────────────────── */}
        {exito ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <CheckCircle size={40} color="#16a34a" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '8px' }}>
              ¡Visita pedida!
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              {fechaSeleccionada?.toLocaleDateString('es-BO', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
            <p style={{ color: '#0ea5e9', fontWeight: 600, fontSize: '1.1rem', marginBottom: '24px' }}>
              {slotSeleccionado?.hora_inicio} — {slotSeleccionado?.hora_fin}
            </p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              El propietario recibirá una notificación. Puedes revisar tu cita en Mi Agenda.
            </p>
            <button onClick={onClose}
              style={{
                background: '#0ea5e9', color: 'var(--color-surface)', border: 'none',
                padding: '12px 32px', borderRadius: '10px', fontWeight: 600,
                cursor: 'pointer', fontSize: '1rem',
              }}>
              Cerrar
            </button>
          </div>
        ) : (
          <div style={{ padding: '24px' }}>

            <Stepper current={paso} total={3} label={paso === 1 ? 'Elige el día' : paso === 2 ? 'Elige la hora' : 'Confirma tu visita'} />

            {/* ── Paso 1: Calendario ─────────────────────────────────── */}
            {paso === 1 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: '16px',
              }}>
                <button onClick={irMesAnterior}
                  style={{ background: 'var(--color-bg-secondary)', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>
                  <ChevronLeft size={18} color="#475569" />
                </button>
                <span style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: '1rem' }}>
                  {MESES[mesVista.getMonth()]} {mesVista.getFullYear()}
                </span>
                <button onClick={irMesSiguiente}
                  style={{ background: 'var(--color-bg-secondary)', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>
                  <ChevronRight size={18} color="#475569" />
                </button>
              </div>

              {/* Cabecera días */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                {DIAS_SEMANA.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', padding: '4px 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Días del mes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {dias.map((dia, i) => {
                  if (!dia) return <div key={`e-${i}`} />;
                  const pasada = esFechaPasada(dia);
                  const sel    = esFechaSeleccionada(dia);
                  return (
                    <button
                      key={dia.toISOString()}
                      onClick={() => { if (!pasada) { setFechaSeleccionada(dia); setPaso(2); } }}
                      disabled={pasada}
                      style={{
                        padding: '8px 4px', borderRadius: '8px', border: 'none',
                        cursor:     pasada ? 'not-allowed' : 'pointer',
                        background: sel ? '#0ea5e9' : 'transparent',
                        color:      sel ? '#fff' : pasada ? '#cbd5e1' : 'var(--color-text)',
                        fontWeight: sel ? 700 : 400,
                        fontSize: '0.9rem', transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (!pasada && !sel) e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
                      onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {dia.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            {/* ── Paso 2: Slots de hora ───────────────────────────────── */}
            {paso === 2 && fechaSeleccionada && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} color="#0ea5e9" />
                    <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.95rem' }}>
                      {fechaSeleccionada.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                  <button type="button" onClick={() => setPaso(1)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                    Cambiar día
                  </button>
                </div>

                {cargandoSlots ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                    Cargando horarios...
                  </div>
                ) : slots.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {slots.map(slot => {
                      const sel = slotSeleccionado?.hora_inicio === slot.hora_inicio;
                      return (
                        <button
                          key={slot.hora_inicio}
                          onClick={() => { if (slot.disponible) { setSlotSeleccionado(slot); setPaso(3); } }}
                          disabled={!slot.disponible}
                          style={{
                            padding: '10px 8px', borderRadius: '8px',
                            cursor:     slot.disponible ? 'pointer' : 'not-allowed',
                            border:     sel ? '2px solid #0ea5e9' : '1px solid var(--color-border)',
                            background: sel ? 'rgba(14,165,233,0.15)' : slot.disponible ? 'var(--color-bg-secondary)' : 'var(--color-bg-secondary)',
                            color:      sel ? '#38bdf8' : slot.disponible ? 'var(--color-text)' : 'var(--color-text-muted)',
                            fontWeight: sel ? 700 : 500,
                            fontSize: '0.85rem', textAlign: 'center',
                            transition: 'all 0.15s',
                          }}
                        >
                          {slot.hora_inicio}
                          {!slot.disponible && (
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
                              Ocupado
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : !cargandoSlots && (
                  <div style={{
                    padding: '16px', background: 'rgba(251,191,36,0.12)', borderRadius: '8px',
                    color: '#fbbf24', fontSize: '0.9rem', textAlign: 'center',
                  }}>
                    {error || 'No hay horarios disponibles para este día.'}
                  </div>
                )}
              </div>
            )}

            {/* ── Paso 3: Notas + Confirmación ────────────────────────── */}
            {paso === 3 && slotSeleccionado && (
              <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <button type="button" onClick={() => setPaso(2)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                  Cambiar horario
                </button>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  Notas para el propietario (opcional)
                </label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Ej: ¿Tiene estacionamiento disponible?"
                  rows={3}
                  style={{
                    width: '100%', border: '1px solid var(--color-border)', borderRadius: '8px',
                    padding: '10px 12px', fontSize: '0.9rem', resize: 'vertical',
                    fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#0ea5e9')}
                  onBlur={e  => (e.target.style.borderColor = 'var(--color-border)')}
                />
              </div>

            {/* Resumen */}
            {fechaSeleccionada && (
              <div style={{
                padding: '14px 16px', background: 'var(--color-bg-secondary)', borderRadius: '10px',
                border: '1px solid #bae6fd', marginBottom: '20px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <Calendar size={20} color="#0ea5e9" />
                <div>
                  <div style={{ fontWeight: 600, color: '#38bdf8', fontSize: '0.95rem' }}>
                    {fechaSeleccionada.toLocaleDateString('es-BO', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </div>
                  <div style={{ color: '#0ea5e9', fontSize: '0.9rem' }}>
                    {slotSeleccionado.hora_inicio} — {slotSeleccionado.hora_fin} (1 hora)
                  </div>
                </div>
              </div>
            )}
              </>
            )}

            {/* ── Error general ───────────────────────────────────────── */}
            {error && slots.length > 0 && (
              <div style={{
                padding: '12px 16px', background: 'rgba(244, 63, 94, 0.10)', border: '1px solid #fecaca',
                borderRadius: '8px', color: '#f87171', fontSize: '0.9rem', marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            {/* ── Botones ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={onClose}
                style={{
                  padding: '10px 20px', border: '1px solid var(--color-border)', borderRadius: '10px',
                  background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontWeight: 600, cursor: 'pointer',
                }}>
                Cancelar
              </button>
              {paso === 3 && (
                <button
                  onClick={handleAgendar}
                  disabled={guardando}
                  style={{
                    padding: '10px 24px', border: 'none', borderRadius: '10px',
                    background: '#0ea5e9',
                    color: '#fff', fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  <Calendar size={16} />
                  {guardando ? 'Enviando...' : 'Pedir visita'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalAgendarCita;