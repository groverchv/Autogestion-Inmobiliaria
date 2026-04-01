import { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Button from '../../components/Button';
import './Login.css';

/**
 * Página de inicio de sesión.
 */
const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      setError('Credenciales incorrectas. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login" id="login-page">
      <form className="login__form" onSubmit={handleSubmit}>
        {error && <div className="login__error">{error}</div>}

        <div className="login__field">
          <label htmlFor="username" className="login__label">Usuario</label>
          <input
            id="username"
            type="text"
            className="login__input"
            placeholder="Tu nombre de usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="login__field">
          <label htmlFor="password" className="login__label">Contraseña</label>
          <input
            id="password"
            type="password"
            className="login__input"
            placeholder="Tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" fullWidth loading={loading}>
          Iniciar Sesión
        </Button>
        
        {/* 2. Agregamos la sección de Registro */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#cbd5e1' }}>
          ¿No tienes una cuenta?{' '}
          <Link to="/registro" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 'bold' }}>
            Regístrate aquí
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
