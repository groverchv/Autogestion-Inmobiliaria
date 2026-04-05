import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import UserMenu from '../../components/UserMenu';
import useAuth from '../../hooks/useAuth';
import './Propiedades.css';

const MiPerfil = () => {
  const { isAuthenticated, user, updateUser } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    telefono: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        telefono: user.telefono || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateUser(formData);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      setError('Ocurrió un error al actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="propiedades-page">
      <Navbar />
      {isAuthenticated && user?.rol !== 'admin' && (
        <UserMenu />
      )}
      
      <div className="propiedades-content" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="propiedad-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ color: 'var(--color-text)', margin: 0 }}>Datos Personales</h2>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="propiedad-card__cta"
                style={{ background: 'var(--color-bg-hover)', color: 'var(--color-primary)' }}
              >
                Editar Perfil
              </button>
            )}
          </div>

          {error && <div style={{ color: 'var(--color-danger)', marginBottom: '16px' }}>{error}</div>}

          {isEditing ? (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Nombres</label>
                  <input 
                    type="text" 
                    name="first_name" 
                    value={formData.first_name} 
                    onChange={handleChange} 
                    className="propiedades-filter__input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Apellidos</label>
                  <input 
                    type="text" 
                    name="last_name" 
                    value={formData.last_name} 
                    onChange={handleChange} 
                    className="propiedades-filter__input" 
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Correo Electrónico</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  className="propiedades-filter__input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Teléfono</label>
                <input 
                  type="text" 
                  name="telefono" 
                  value={formData.telefono} 
                  onChange={handleChange} 
                  className="propiedades-filter__input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)} 
                  className="propiedad-card__cta" 
                  style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="propiedad-card__cta" 
                  disabled={saving}
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <strong style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Nombre de Usuario</strong>
                <div style={{ fontSize: '1rem', color: 'var(--color-text)' }}>{user?.username}</div>
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Nombre Completo</strong>
                <div style={{ fontSize: '1rem', color: 'var(--color-text)' }}>{user?.first_name} {user?.last_name}</div>
              </div>
              <div>
                <strong style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Correo Electrónico</strong>
                <div style={{ fontSize: '1rem', color: 'var(--color-text)' }}>{user?.email}</div>
              </div>
              {user?.telefono && (
                <div>
                  <strong style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Teléfono</strong>
                  <div style={{ fontSize: '1rem', color: 'var(--color-text)' }}>{user?.telefono}</div>
                </div>
              )}
              <div>
                <strong style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>Rol</strong>
                <span style={{ textTransform: 'capitalize', background: 'rgba(14,165,233,0.1)', color: 'var(--color-primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                  {user?.rol === 'admin' ? 'Administrador' : 'Usuario'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MiPerfil;
