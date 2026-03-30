import useStore from '../../store/store';

/**
 * Dashboard del usuario.
 */
const UserDashboard = () => {
  const user = useStore((state) => state.user);

  return (
    <div className="user-dashboard" id="user-dashboard-page">
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
        Bienvenido, {user?.first_name || 'Usuario'} 👋
      </h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Este es tu panel personal. Desde aquí podrás gestionar tus inmuebles, contratos y pagos.
      </p>
    </div>
  );
};

export default UserDashboard;
