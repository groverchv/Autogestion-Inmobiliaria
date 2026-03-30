/**
 * Gestión de usuarios (Admin).
 */
const ManageUsers = () => {
  return (
    <div className="manage-users" id="manage-users-page">
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-lg)' }}>
        Gestión de Usuarios
      </h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Aquí podrás listar, crear, editar y eliminar usuarios del sistema.
      </p>
    </div>
  );
};

export default ManageUsers;
