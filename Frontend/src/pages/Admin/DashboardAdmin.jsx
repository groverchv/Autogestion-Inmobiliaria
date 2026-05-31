import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Home, FileText, Banknote, Archive, Calendar, Bell,
  MapPin, TrendingUp, Clock, CheckCircle, LineChart
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';

const DashboardAdmin = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    usuarios: 0, inmuebles: 0, contratos: 0, pagos: 0,
    categorias: 0, notificaciones: 0, agenda: 0, ingresos: 0
  });
  const [recentInmuebles, setRecentInmuebles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usuarios, inmuebles, contratos, pagos, categorias, notificaciones, agenda, reportes] = await Promise.all([
          api.get('/usuarios/lista/').then(r => r.data).catch(() => []),
          api.get('/inmuebles/lista/').then(r => r.data).catch(() => []),
          api.get('/inmuebles/contratos/').then(r => r.data).catch(() => []),
          api.get('/pagos/lista/').then(r => r.data).catch(() => []),
          api.get('/inmuebles/tipos/').then(r => r.data).catch(() => []),
          api.get('/usuarios/notificaciones/').then(r => r.data).catch(() => []),
          api.get('/usuarios/agenda/').then(r => r.data).catch(() => []),
          api.get('/pagos/reportes/').then(r => r.data).catch(() => ({})),
        ]);

        setStats({
          usuarios: Array.isArray(usuarios) ? usuarios.length : usuarios?.count || 0,
          inmuebles: Array.isArray(inmuebles) ? inmuebles.length : inmuebles?.count || 0,
          contratos: Array.isArray(contratos) ? contratos.length : contratos?.count || 0,
          pagos: Array.isArray(pagos) ? pagos.length : pagos?.count || 0,
          categorias: Array.isArray(categorias) ? categorias.length : categorias?.count || 0,
          notificaciones: Array.isArray(notificaciones) ? notificaciones.length : notificaciones?.count || 0,
          agenda: Array.isArray(agenda) ? agenda.length : agenda?.count || 0,
          ingresos: reportes?.kpis?.total_ingreso_comisiones || 0,
        });

        setRecentInmuebles(Array.isArray(inmuebles) ? inmuebles.slice(0, 5) : []);
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const cards = [
    { icon: <Users size={24} />, label: 'Usuarios', value: stats.usuarios, color: '#0ea5e9', bg: '#e0f2fe', link: '/panel/usuarios' },
    { icon: <Home size={24} />, label: 'Inmuebles', value: stats.inmuebles, color: '#0284c7', bg: '#e0f2fe', link: '/panel/inmuebles' },
    { icon: <FileText size={24} />, label: 'Contratos', value: stats.contratos, color: '#16a34a', bg: '#dcfce7', link: '/panel/contratos' },
    { icon: <Banknote size={24} />, label: 'Pagos', value: stats.pagos, color: '#f59e0b', bg: '#fef3c7', link: '/panel/pagos' },
    { icon: <LineChart size={24} />, label: 'Finanzas', value: `Bs. ${stats.ingresos.toLocaleString()}`, color: '#6366f1', bg: '#f5f3ff', link: '/panel/finanzas' },
    { icon: <Archive size={24} />, label: 'Categorías', value: stats.categorias, color: '#ec4899', bg: '#fce7f3', link: '/panel/categorias' },
    { icon: <Calendar size={24} />, label: 'Agenda', value: stats.agenda, color: '#06b6d4', bg: '#cffafe', link: '/panel/agenda' },
    { icon: <Bell size={24} />, label: 'Notificaciones', value: stats.notificaciones, color: '#ef4444', bg: '#fee2e2', link: '/panel/notificaciones' },
  ];

  const s = {
    page: {},
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
