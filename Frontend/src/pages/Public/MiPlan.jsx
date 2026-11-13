import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Crown, CreditCard, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api';

/**
 * Mi Plan — suscripción del usuario.
 * Muestra el plan vigente, el uso (propiedades/fotos) y el flujo de
 * contratación con tarjeta: elegir plan → Stripe Checkout →
 * confirmación automática al volver → plan activado.
 */
const MiPlan = () => {
  const [datos, setDatos] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [contratando, setContratando] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const cargar = async () => {
    try {
      const [miPlan, lista] = await Promise.all([
        api.get('/pagos/suscripciones/mi-plan/'),
        api.get('/pagos/planes/'),
      ]);
      setDatos(miPlan.data);
      setPlanes(Array.isArray(lista.data) ? lista.data : lista.data.results || []);
    } catch (e) {
      setError('No se pudo cargar tu plan. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    const estadoPago = searchParams.get('pago');
    const sessionId = searchParams.get('session_id');
    const limpiar = () => setSearchParams({}, { replace: true });

    if (estadoPago === 'exito' && sessionId) {
      api.get(`/pagos/suscripciones/confirmar-stripe/?session_id=${sessionId}`)
        .then((r) => {
          if (r.data.estado === 'completado') {
            setAviso(`Pago confirmado. Tu plan ${r.data.plan_nombre} ya está activo.`);
          } else {
            setAviso('Stripe está procesando tu pago. Se activará en breve.');
          }
          cargar().finally(limpiar);
        })
        .catch(() => { setError('No se pudo confirmar el pago.'); limpiar(); });
    } else if (estadoPago === 'cancelado') {
      setAviso('Pago cancelado. Puedes intentarlo cuando quieras.');
      limpiar();
      cargar();
    } else {
      cargar();
    }
  }, []);

  const cancelarPago = async () => {
    if (!datos?.pago_pendiente) return;
    try {
      await api.post(`/pagos/pagos-suscripcion/${datos.pago_pendiente.id}/cancelar/`);
      await cargar();
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo cancelar el pago.');
    }
  };

  const contratar = async (plan) => {
    setContratando(true);
    setError('');
    try {
      const r = await api.post('/pagos/suscripciones/checkout-stripe/', { plan_id: plan.id });
      if (r.data.checkout_url) {
        window.location.href = r.data.checkout_url;
        return;
      }
      await cargar(); // plan gratis
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo iniciar el pago.');
      setContratando(false);
    }
  };

  if (cargando) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Cargando tu plan…</div>;
  if (error && !datos) return <div style={{ padding: '3rem', textAlign: 'center', color: '#f87171' }}>{error}</div>;

  const plan = datos?.plan;
  const uso = datos?.uso || { inmuebles: 0 };
  const pendiente = datos?.pago_pendiente;
  const maxInm = plan?.max_inmuebles ?? 0;
  const pctUso = maxInm ? Math.min(100, (uso.inmuebles / maxInm) * 100) : 0;

  const card = {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: '14px',
    padding: '1.5rem',
  };
  const txt = { color: 'var(--color-text)' };
  const txtSec = { color: 'var(--color-text-secondary)' };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, ...txt }}>Mi Plan</h1>
      <p style={{ ...txtSec, marginTop: '4px' }}>Tu suscripción y los límites de publicación.</p>

      {aviso && (
        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1rem', padding: '12px 14px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)', color: '#34d399', fontSize: '0.9rem' }}>
          <CheckCircle size={17} /> {aviso}
        </p>
      )}
      {error && <p style={{ color: '#f87171', marginTop: '1rem' }}>{error}</p>}

      {/* ─── Plan actual ─── */}
      <div style={{ marginTop: '1.5rem', ...card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Crown size={26} color="#f59e0b" />
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', ...txt }}>
              Plan {plan?.nombre ?? 'Sin plan'}
            </h2>
            {datos?.suscripcion?.fecha_vencimiento && (
              <p style={{ margin: 0, fontSize: '0.85rem', ...txtSec }}>
                Vigente hasta {new Date(datos.suscripcion.fecha_vencimiento).toLocaleDateString('es-BO')}
              </p>
            )}
          </div>
          {plan && <span style={{ fontSize: '1.3rem', fontWeight: 800, ...txt }}>Bs {Number(plan.precio)}<small style={{ fontWeight: 400, ...txtSec }}>/mes</small></span>}
        </div>

        {plan && (
          <div style={{ marginTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', ...txtSec }}>
              <span>Propiedades publicadas</span>
              <span><strong>{uso.inmuebles}</strong> de {maxInm}</span>
            </div>
            <div style={{ marginTop: '6px', height: '8px', borderRadius: '4px', background: 'var(--color-bg-secondary)', overflow: 'hidden' }}>
              <div style={{ width: `${pctUso}%`, height: '100%', background: pctUso >= 100 ? '#ef4444' : 'var(--color-primary)', transition: 'width .3s' }} />
            </div>
            {uso.inmuebles >= maxInm && (
              <p style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.85rem', color: '#f87171' }}>
                <AlertCircle size={15} /> Llegaste al límite de tu plan. Mejora tu plan para publicar más.
              </p>
            )}
          </div>
        )}

        {datos?.vistas != null && (
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', ...txtSec }}>
            Visitas totales a tus propiedades: <strong style={txt}>{datos.vistas}</strong>
          </p>
        )}
      </div>

      {/* ─── Pago pendiente ─── */}
      {pendiente && (
        <div style={{ marginTop: '1.5rem', border: '1px solid rgba(245,158,11,0.45)', background: 'rgba(245,158,11,0.08)', borderRadius: '14px', padding: '1.5rem' }}>
          {pendiente.estado === 'en_revision' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={22} color="#f59e0b" />
              <div>
                <strong style={{ color: '#fbbf24' }}>Pago en revisión — Plan {pendiente.plan_nombre}</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem', ...txtSec }}>
                  Recibimos tu comprobante. Activamos tu plan en cuanto lo confirmemos (máximo 24 h hábiles).
                </p>
              </div>
            </div>
          ) : (
            <>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#fbbf24' }}>
                Completa tu pago — Plan {pendiente.plan_nombre} (Bs {Number(pendiente.monto)}/mes)
              </h3>
              <p style={{ margin: '8px 0 12px', fontSize: '0.9rem', ...txtSec }}>
                Tu cobro quedó pendiente. Continúa con tarjeta para activarlo al instante.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  onClick={() => contratar(planes.find((p) => p.id === pendiente.plan) || { id: pendiente.plan, precio: pendiente.monto })}
                  disabled={contratando}
                  style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#f59e0b', color: '#111827', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  <CreditCard size={17} /> {contratando ? 'Abriendo Stripe…' : 'Pagar con tarjeta'}
                </button>
                <button
                  onClick={cancelarPago}
                  style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancelar pago
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Planes disponibles ─── */}
      <h2 style={{ marginTop: '2.5rem', fontSize: '1.15rem', ...txt }}>Cambiar de plan</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
        {planes.map((p) => {
          const esActual = plan?.id === p.id;
          const hayPendiente = pendiente && pendiente.plan === p.id;
          return (
            <div key={p.id} style={{ ...card, border: esActual ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
              {esActual && <span style={{ alignSelf: 'flex-start', fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tu plan actual</span>}
              <h3 style={{ margin: '6px 0 0', fontSize: '1.05rem', ...txt }}>{p.nombre}</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', ...txtSec }}>{p.descripcion}</p>
              <p style={{ margin: '10px 0', fontSize: '1.5rem', fontWeight: 800, ...txt }}>
                Bs {Number(p.precio)}<small style={{ fontSize: '0.8rem', fontWeight: 400, ...txtSec }}>/mes</small>
                {p.precio > 0 && (
                  <small style={{ display: 'block', fontSize: '0.75rem', fontWeight: 400, ...txtSec }}>
                    ≈ US$ {(Number(p.precio) / 6.96).toFixed(2)} con tarjeta
                  </small>
                )}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem', flex: 1, fontSize: '0.83rem', ...txtSec, lineHeight: 2 }}>
                <li><Check size={14} color="#10b981" style={{ verticalAlign: '-2px' }} /> Hasta {p.max_inmuebles} {p.max_inmuebles === 1 ? 'propiedad' : 'propiedades'}</li>
                <li><Check size={14} color={p.permite_360 ? '#10b981' : '#475569'} style={{ verticalAlign: '-2px' }} /> Tours 360{p.max_fotos ? ` · máx ${p.max_fotos} fotos` : ' · fotos ilimitadas'}</li>
                <li><Check size={14} color={p.permite_destacado ? '#10b981' : '#475569'} style={{ verticalAlign: '-2px' }} /> Propiedades destacadas</li>
                <li><Check size={14} color={p.permite_estadisticas ? '#10b981' : '#475569'} style={{ verticalAlign: '-2px' }} /> Estadísticas de visitas</li>
                {p.max_usuarios > 1 && <li><Check size={14} color="#10b981" style={{ verticalAlign: '-2px' }} /> {p.max_usuarios} usuarios del equipo</li>}
              </ul>
              {!esActual && !hayPendiente && (
                <button
                  onClick={() => contratar(p)}
                  disabled={contratando}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', background: p.precio > 0 ? 'var(--color-primary)' : 'var(--color-bg-secondary)', color: p.precio > 0 ? '#fff' : 'var(--color-text)' }}
                >
                  {contratando ? 'Abriendo Stripe…' : p.precio > 0 ? <><CreditCard size={16} /> Contratar por Bs {Number(p.precio)}/mes</> : 'Cambiar a Gratis'}
                </button>
              )}
              {hayPendiente && <span style={{ fontSize: '0.8rem', color: '#f59e0b', textAlign: 'center' }}>Pago en curso</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MiPlan;
