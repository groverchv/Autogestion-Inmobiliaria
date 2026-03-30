/**
 * Dashboard del administrador.
 */
const DashboardAdmin = () => {
  return (
    <div className="dashboard-admin" id="admin-dashboard-page">
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
        Dashboard Administrativo
      </h1>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 'var(--spacing-lg)',
      }}>
        {[
          { icon: '👥', label: 'Usuarios', value: '—', color: '#6366f1' },
          { icon: '🏢', label: 'Inmuebles', value: '—', color: '#0ea5e9' },
          { icon: '📄', label: 'Contratos', value: '—', color: '#22c55e' },
          { icon: '💰', label: 'Pagos', value: '—', color: '#f59e0b' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-xl)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
            }}
          >
            <span style={{ fontSize: '2rem' }}>{stat.icon}</span>
            <div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>{stat.label}</p>
              <p style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: stat.color }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardAdmin;
