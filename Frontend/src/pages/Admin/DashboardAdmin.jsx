import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import useStore from '../../store/store';

const DashboardAdmin = () => {
  const { user } = useStore();
  const [stats, setStats] = useState({ usuarios: 0, inmuebles: 0, contratos: 0, pagos: 0, categorias: 0, notificaciones: 0, agenda: 0 });
  const [recentInmuebles, setRecentInmuebles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // El admin ve todo — este dashboard solo es accesible por admin
    const fetches = [
      api.get('/inmuebles/panel/lista/').then(r => {
        const d = r.data.results || r.data;
        setStats(prev => ({ ...prev, inmuebles: Array.isArray(d) ? d.length : 0 }));
        setRecentInmuebles(Array.isArray(d) ? d.slice(0, 5) : []);
      }).catch(() => {}),

      api.get('/usuarios/panel/lista/').then(r => {
        const d = r.data.results || r.data;
        setStats(prev => ({ ...prev, usuarios: Array.isArray(d) ? d.length : 0 }));
      }).catch(() => {}),

      api.get('/inmuebles/panel/contratos/').then(r => {
        const d = r.data.results || r.data;
        setStats(prev => ({ ...prev, contratos: Array.isArray(d) ? d.length : 0 }));
      }).catch(() => {}),

      api.get('/pagos/panel/lista/').then(r => {
        const d = r.data.results || r.data;
        setStats(prev => ({ ...prev, pagos: Array.isArray(d) ? d.length : 0 }));
      }).catch(() => {}),

      api.get('/inmuebles/panel/tipos/').then(r => {
        const d = r.data.results || r.data;
        setStats(prev => ({ ...prev, categorias: Array.isArray(d) ? d.length : 0 }));
      }).catch(() => {}),

      api.get('/usuarios/panel/agenda/').then(r => {
        const d = r.data.results || r.data;
        setStats(prev => ({ ...prev, agenda: Array.isArray(d) ? d.length : 0 }));
      }).catch(() => {}),

      api.get('/usuarios/panel/notificaciones/').then(r => {
        const d = r.data.results || r.data;
        setStats(prev => ({ ...prev, notificaciones: Array.isArray(d) ? d.length : 0 }));
      }).catch(() => {}),
    ];

    Promise.all(fetches).finally(() => setLoading(false));
  }, []);

  const Icons = {
    usuarios: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    inmuebles: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    contratos: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    pagos: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    categorias: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
    agenda: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    notificaciones: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  };

  const cards = [
    { icon: Icons.usuarios, label: 'Usuarios', value: stats.usuarios, color: '#0ea5e9', bg: '#e0f2fe', link: '/panel/usuarios' },
    { icon: Icons.inmuebles, label: 'Inmuebles', value: stats.inmuebles, color: '#0284c7', bg: '#e0f2fe', link: '/panel/inmuebles' },
    { icon: Icons.contratos, label: 'Contratos', value: stats.contratos, color: '#16a34a', bg: '#dcfce7', link: '/panel/contratos' },
    { icon: Icons.pagos, label: 'Pagos', value: stats.pagos, color: '#f59e0b', bg: '#fef3c7', link: '/panel/pagos' },
    { icon: Icons.categorias, label: 'Categorías', value: stats.categorias, color: '#ec4899', bg: '#fce7f3', link: '/panel/categorias' },
    { icon: Icons.agenda, label: 'Agenda', value: stats.agenda, color: '#06b6d4', bg: '#cffafe', link: '/panel/agenda' },
    { icon: Icons.notificaciones, label: 'Notificaciones', value: stats.notificaciones, color: '#ef4444', bg: '#fee2e2', link: '/panel/notificaciones' },
  ];

  const s = {
    page: { },
    greeting: { fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' },
    subtitle: { color: '#64748b', fontSize: '0.9rem', marginBottom: '28px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' },
    card: () => ({ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', textDecoration: 'none', transition: 'all 0.25s', position: 'relative', overflow: 'hidden' }),
    cardIcon: (bg, color) => ({ width: '44px', height: '44px', borderRadius: '12px', background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }),
    cardLabel: { fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginBottom: '4px' },
    cardValue: (color) => ({ fontSize: '1.8rem', fontWeight: 800, color }),
    section: { background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', marginBottom: '20px' },
    sectionTitle: { fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
  };

  if (loading) return <p style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Cargando dashboard...</p>;

  return (
    <div style={s.page}>
      <h1 style={s.greeting}>Hola, {user?.first_name} {user?.last_name}</h1>
      <p style={s.subtitle}>
        Rol: <strong style={{ color: '#0ea5e9' }}>{user?.rol_nombre || 'Administrador'}</strong> — Resumen de tu panel de gestión.
      </p>

      {/* Tarjetas de estadísticas */}
      <div style={s.grid}>
        {cards.map(card => (
          <Link key={card.label} to={card.link} style={s.card(card.bg)}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div style={s.cardIcon(card.bg, card.color)}>{card.icon}</div>
            <p style={s.cardLabel}>{card.label}</p>
            <p style={s.cardValue(card.color)}>{card.value}</p>
          </Link>
        ))}
      </div>

      {/* Inmuebles recientes */}
      <div style={s.section}>
        <h2 style={s.sectionTitle}>Últimos Inmuebles Registrados</h2>
        {recentInmuebles.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Título</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Categoría</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Ciudad</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Precio</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentInmuebles.map(inm => (
                  <tr key={inm.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{inm.titulo}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600 }}>{inm.tipo_nombre}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>{inm.ciudad}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0ea5e9' }}>Bs. {parseFloat(inm.precio).toLocaleString()}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize', color: inm.estado === 'disponible' ? '#16a34a' : inm.estado === 'ocupado' ? '#dc2626' : '#f59e0b' }}>{inm.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Sin inmuebles recientes.</p>
        )}
      </div>
    </div>
  );
};

export default DashboardAdmin;
