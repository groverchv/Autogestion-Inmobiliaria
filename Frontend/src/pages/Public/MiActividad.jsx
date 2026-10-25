import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, FileText, CreditCard, Clock, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import contratoService from '../../services/contratoService';
import useAuth from '../../hooks/useAuth';
import SimpleStatus from '../../components/SimpleStatus';
import EmptyState from '../../components/EmptyState';
import ActionNeeded from '../../components/ActionNeeded';

const TABS = [
  { id: 'todo', label: 'Todo' },
  { id: 'visita', label: 'Visitas' },
  { id: 'contrato', label: 'Contratos' },
  { id: 'pago', label: 'Pagos' },
];

const TIPO_ICON = { visita: Calendar, contrato: FileText, pago: CreditCard };

const MiActividad = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('todo');
  const [citas, setCitas] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/inmuebles/citas/mis-citas-agenda/').catch(() => ({ data: [] })),
      contratoService.getAll().catch(() => []),
      api.get('/pagos/lista/?personal=true').catch(() => ({ data: [] })),
    ]).then(([cRes, cData, pRes]) => {
      setCitas(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.results || []));
      setContratos(Array.isArray(cData) ? cData : (cData?.results || []));
      setPagos(Array.isArray(pRes.data) ? pRes.data : (pRes.data?.results || []));
    }).finally(() => setLoading(false));
  }, []);

  // ─── Acciones pendientes del usuario ─────────────────────────────────
  const pendientes = [];
  contratos.forEach(c => {
    if (c.estado === 'enviado' && c.propietario_email !== user?.email) {
      pendientes.push({
        icon: FileText,
        title: `Tienes un contrato por firmar — ${c.inmueble_titulo || 'Propiedad'}`,
        text: 'Revísalo y fírmalo para continuar.',
        actionLabel: 'Revisar y firmar',
        actionTo: '/mis-contratos',
      });
    }
  });
  citas.forEach(c => {
    const f = new Date(`${c.fecha}T${c.hora_inicio || '00:00'}`);
    if (c.estado === 'pendiente' && f >= new Date()) {
      pendientes.push({
        icon: Calendar,
        title: c.propietario === user?.id
          ? `Visita por confirmar — ${c.inmueble_titulo || 'Propiedad'}`
          : `Visita pedida — ${c.inmueble_titulo || 'Propiedad'}`,
        text: `${f.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${c.hora_inicio || ''}`,
        actionLabel: 'Ver visita',
        actionTo: '/mi-agenda',
      });
    }
  });
  pagos.forEach(p => {
    if (p.estado === 'pendiente') {
      pendientes.push({
        icon: CreditCard,
        title: `Pago pendiente — ${p.inmueble_titulo || 'Propiedad'}`,
        text: `Bs ${parseFloat(p.monto || 0).toLocaleString('es-BO')}`,
        actionLabel: 'Ver pago',
        actionTo: '/mis-pagos',
      });
    }
  });

  // ─── Timeline unificado ───────────────────────────────────────────────
  const items = [
    ...citas.map(c => ({
      tipo: 'visita', estado: c.estado,
      fecha: new Date(`${c.fecha}T${c.hora_inicio || '00:00'}`),
      titulo: `Visita — ${c.inmueble_titulo || 'Propiedad'}`,
      detalle: c.hora_inicio ? `a las ${c.hora_inicio}` : '',
      link: '/mi-agenda',
    })),
    ...contratos.map(c => ({
      tipo: 'contrato', estado: c.estado,
      fecha: c.inicio ? new Date(c.inicio) : new Date(0),
      titulo: `Contrato — ${c.inmueble_titulo || 'Propiedad'}`,
      detalle: `desde ${c.inicio || '—'}${c.fin ? ` hasta ${c.fin}` : ''}`,
      link: '/mis-contratos',
    })),
    ...pagos.map(p => ({
      tipo: 'pago', estado: p.estado,
      fecha: new Date(p.fecha || p.creado || 0),
      titulo: `Pago — ${p.inmueble_titulo || 'Propiedad'}`,
      detalle: `Bs ${parseFloat(p.monto || 0).toLocaleString('es-BO')}`,
      link: '/mis-pagos',
    })),
  ].sort((a, b) => b.fecha - a.fecha);

  const filtrados = tab === 'todo' ? items : items.filter(i => i.tipo === tab);
  const formatFecha = (d) => d.getTime() === 0 ? '' : d.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="propiedades-page">
      <div className="propiedades-content" style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '24px 20px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>Mi actividad</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 24px', fontSize: '0.95rem' }}>
          Tus visitas, contratos y pagos en un solo lugar.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>Cargando tu actividad...</div>
        ) : (
          <>
            {/* Acciones pendientes */}
            {pendientes.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                {pendientes.map((p, i) => (
                  <ActionNeeded key={i} icon={p.icon} title={p.title} text={p.text} actionLabel={p.actionLabel} actionTo={p.actionTo} />
                ))}
              </div>
            )}

            {/* Pestañas */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }} role="tablist" aria-label="Filtrar actividad">
              {TABS.map(t => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '8px 18px', borderRadius: '999px', border: '1px solid var(--color-border)',
                    background: tab === t.id ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: tab === t.id ? '#fff' : 'var(--color-text-secondary)',
                    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Timeline */}
            {filtrados.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Aún no tienes actividad"
                text="Tus visitas, contratos y pagos aparecerán aquí."
                actionLabel="Explorar propiedades"
                actionTo="/propiedades"
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filtrados.map((item, i) => {
                  const Icon = TIPO_ICON[item.tipo];
                  return (
                    <Link
                      key={i}
                      to={item.link}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        background: 'var(--color-surface)', borderRadius: '12px',
                        border: '1px solid var(--color-border)', padding: '14px 18px',
                        textDecoration: 'none',
                      }}
                    >
                      <div style={{
                        width: '40px', height: '40px', flexShrink: 0, borderRadius: '10px',
                        background: 'var(--color-bg-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--color-primary)',
                      }}>
                        <Icon size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: '0.92rem' }}>{item.titulo}</div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                          {formatFecha(item.fecha)}{item.detalle ? ` · ${item.detalle}` : ''}
                        </div>
                      </div>
                      <SimpleStatus status={item.estado} />
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MiActividad;
