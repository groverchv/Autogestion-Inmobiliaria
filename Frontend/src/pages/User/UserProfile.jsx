import useStore from '../../store/store';

/**
 * Perfil del usuario.
 */
const UserProfile = () => {
  const user = useStore((state) => state.user);

  return (
    <div className="user-profile" id="user-profile-page">
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
        Mi Perfil
      </h1>
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-xl)',
      }}>
        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
          <div>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Nombre completo</span>
            <p style={{ fontWeight: 600 }}>{user?.first_name} {user?.last_name}</p>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Email</span>
            <p>{user?.email || '—'}</p>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Teléfono</span>
            <p>{user?.telefono || '—'}</p>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>Rol</span>
            <p>{user?.rol_nombre || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
