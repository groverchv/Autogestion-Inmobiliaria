import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import api from '../../services/api'; 
import './Login.css'; 

const Registro = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    telefono: '',
    ci: '',
    nacimiento: '',
    password: '',
    confirm_password: ''
  });
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [modalTerminosAbierto, setModalTerminosAbierto] = useState(false);
  const [paso, setPaso] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Escape cierra el modal de Términos (accesibilidad)
  useEffect(() => {
    if (!modalTerminosAbierto) return;
    const onKeyDown = (e) => { if (e.key === 'Escape') setModalTerminosAbierto(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modalTerminosAbierto]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const irAPaso2 = () => {
    setError('');
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()) {
      setError('Completa tu nombre y correo para continuar.');
      return;
    }
    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setError('Las contraseñas no coinciden. Revísalas.');
      return;
    }
    setPaso(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!aceptaTerminos) {
      setError('Debes leer y aceptar los Términos y Condiciones para crear tu cuenta.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    // Validación mayores de 18 años
    const today = new Date();
    const minBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    
    if (formData.nacimiento && formData.nacimiento > minBirthDate) {
      setError('Debes ser mayor de 18 años para poder registrarte.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/usuarios/registro/', {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        telefono: formData.telefono,
        ci: formData.ci,
        nacimiento: formData.nacimiento,
        password: formData.password,
        rol: 'usuario',
        acepta_terminos: aceptaTerminos
      });

      setSuccess('¡Registro exitoso! Redirigiendo al inicio de sesión...');
      setTimeout(() => {
        navigate('/login');
      }, 1800);
      
    } catch (err) {
      const resp = err.response?.data;
      let msg = 'Error al registrar. Verifica los datos ingresados.';
      if (resp && typeof resp === 'object') {
        msg = Object.entries(resp).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`).join(' | ');
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login" id="register-page" style={{ width: '100%' }}>
      <form className="login__form" onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
          <h2 style={{ color: '#f8fafc', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 4px 0' }}>
            Crear Cuenta
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
            Paso {paso} de 2 · {paso === 1 ? 'Tu cuenta' : 'Tus datos'}
          </p>
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', justifyContent: 'center' }}>
            {[1, 2].map(n => (
              <div key={n} style={{ width: '60px', height: '4px', borderRadius: '4px', background: n <= paso ? '#0ea5e9' : '#334155' }} />
            ))}
          </div>
        </div>

        {error && <div className="login__error" role="alert" style={{ marginBottom: '1rem' }}>{error}</div>}
        {success && <div role="status" aria-live="polite" style={{ background: '#064e3b', border: '1px solid #10b981', color: '#34d399', padding: '10px', borderRadius: '8px', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>{success}</div>}

        {paso === 1 && (
          <>
            {/* Fila: Nombre y Apellido */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="login__field">
                <label htmlFor="first_name" className="login__label">Nombre</label>
                <input id="first_name" type="text" className="login__input" value={formData.first_name} onChange={handleChange} placeholder="Ej. Carlos" required />
              </div>
              <div className="login__field">
                <label htmlFor="last_name" className="login__label">Apellido</label>
                <input id="last_name" type="text" className="login__input" value={formData.last_name} onChange={handleChange} placeholder="Ej. Mendoza" required />
              </div>
            </div>

            <div className="login__field">
              <label htmlFor="email" className="login__label">Correo Electrónico</label>
              <input id="email" type="email" className="login__input" value={formData.email} onChange={handleChange} placeholder="correo@ejemplo.com" required />
            </div>

            {/* Fila: Contraseña y Confirmar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="login__field">
                <label htmlFor="password" className="login__label">Contraseña</label>
                <input id="password" type="password" className="login__input" value={formData.password} onChange={handleChange} placeholder="Mínimo 8 caracteres" required minLength="8" />
              </div>
              <div className="login__field">
                <label htmlFor="confirm_password" className="login__label">Confirmar Contraseña</label>
                <input id="confirm_password" type="password" className="login__input" value={formData.confirm_password} onChange={handleChange} placeholder="Repite contraseña" required minLength="8" />
              </div>
            </div>

            <Button type="button" fullWidth onClick={irAPaso2}>
              Siguiente
            </Button>
          </>
        )}

        {paso === 2 && (
          <>
            <div style={{
              background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.25)',
              borderRadius: '10px', padding: '12px', marginBottom: '14px',
              fontSize: '0.82rem', color: '#bae6fd', lineHeight: '1.5',
            }}>
              Pedimos tu CI y fecha de nacimiento solo para confirmar que eres mayor de edad
              y para que tus contratos y visitas queden a tu nombre real.
            </div>

            {/* Fila: Cédula y Teléfono */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="login__field">
                <label htmlFor="ci" className="login__label">Cédula de Identidad (CI)</label>
                <input id="ci" type="text" className="login__input" value={formData.ci} onChange={handleChange} placeholder="Ej. 8492011 SC" />
              </div>
              <div className="login__field">
                <label htmlFor="telefono" className="login__label">Teléfono / Celular</label>
                <input id="telefono" type="tel" className="login__input" value={formData.telefono} onChange={handleChange} placeholder="Ej. 70012345" />
              </div>
            </div>

            <div className="login__field">
              <label htmlFor="nacimiento" className="login__label">Fecha de Nacimiento (+18 años)</label>
              <input
                id="nacimiento"
                type="date"
                className="login__input"
                value={formData.nacimiento}
                onChange={handleChange}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                style={{ colorScheme: 'dark' }}
                required
              />
            </div>

        {/* Checkbox Términos y Condiciones */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          background: 'rgba(15, 23, 42, 0.6)',
          border: aceptaTerminos ? '1px solid rgba(14, 165, 233, 0.5)' : '1px solid rgba(51, 65, 85, 0.6)',
          padding: '12px',
          borderRadius: '10px',
          margin: '12px 0 18px 0'
        }}>
          <input 
            type="checkbox" 
            id="terminos_check"
            checked={aceptaTerminos}
            onChange={(e) => setAceptaTerminos(e.target.checked)}
            style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#0ea5e9' }}
          />
          <label htmlFor="terminos_check" style={{ fontSize: '0.82rem', color: '#94a3b8', cursor: 'pointer', lineHeight: '1.4' }}>
            He leído y acepto expresamente los{' '}
            <button
              type="button"
              onClick={() => setModalTerminosAbierto(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontWeight: 'bold',
                padding: 0,
                fontSize: '0.82rem'
              }}
            >
              Términos y Condiciones Generales de Uso
            </button>
            {' '}y la{' '}
            <Link to="/privacidad" target="_blank" style={{ color: '#38bdf8', fontWeight: 'bold' }}>
              Política de Privacidad
            </Link>
            {' '}de Inmobiliaria Nobleve.
          </label>
        </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => { setError(''); setPaso(1); }}
                style={{
                  background: 'transparent', border: '1px solid #334155', color: '#94a3b8',
                  borderRadius: '10px', padding: '0 18px', fontWeight: 600, cursor: 'pointer',
                }}>
                Atrás
              </button>
              <Button type="submit" fullWidth loading={loading}>
                Crear mi cuenta
              </Button>
            </div>
          </>
        )}

        <div style={{ marginTop: '1.2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
          ¿Ya tienes una cuenta registrada?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 'bold' }}>
            Inicia sesión aquí
          </Link>
        </div>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <Link to="/" style={{ fontSize: '0.85rem', color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Volver al Inicio
          </Link>
        </div>
      </form>

      {/* Modal de Términos y Condiciones Extenso y Profesional */}
      {modalTerminosAbierto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}
        role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="terminos-modal-titulo"
            style={{
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Header del Modal */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(14,165,233,0.15)', padding: '8px', borderRadius: '8px', color: '#38bdf8' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h3 id="terminos-modal-titulo" style={{ margin: 0, color: '#f8fafc', fontSize: '1.15rem', fontWeight: 'bold' }}>
                  Términos y Condiciones de Uso
                </h3>
              </div>
              <button 
                onClick={() => setModalTerminosAbierto(false)}
                aria-label="Cerrar términos y condiciones"
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Cuerpo con Scroll */}
            <div style={{
              padding: '20px 24px',
              overflowY: 'auto',
              fontSize: '0.88rem',
              color: '#cbd5e1',
              lineHeight: '1.6'
            }}>
              <div style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#e0f2fe' }}>
                <strong>Marco de Seguridad y Transparencia:</strong> Bienvenido a Inmobiliaria Nobleve. El presente documento regula el uso de los servicios digitales, herramientas de captura inmersiva 360°, contratos inteligentes y pasarelas de pago.
              </div>

              <h4 style={{ color: '#38bdf8', marginTop: '14px', marginBottom: '6px' }}>1. Aceptación y Capacidad Legal</h4>
              <p>Al registrarse en Inmobiliaria Nobleve, el usuario manifiesta ser mayor de 18 años, contar con plena capacidad jurídica para celebrar contratos vinculantes y aceptar las cláusulas aquí estipuladas.</p>

              <h4 style={{ color: '#38bdf8', marginTop: '14px', marginBottom: '6px' }}>2. Autogestión y Publicación de Propiedades</h4>
              <p>Los propietarios son los únicos responsables de garantizar la veracidad, estado legal, ausencia de gravámenes y autenticidad de las publicaciones realizadas. La plataforma provee herramientas auxiliares como el análisis legal con Inteligencia Artificial, las cuales constituyen opiniones técnicas y no reemplazan la fe pública notarial.</p>

              <h4 style={{ color: '#38bdf8', marginTop: '14px', marginBottom: '6px' }}>3. Recorridos 360°, Gafas VR y Derechos Multimedia</h4>
              <p>El contenido multimedia (fotografías panorámicas 360°, modelos tridimensionales, audio espacial) procesado a través de nuestros servidores y Cloudinary está protegido por leyes de propiedad intelectual. Queda prohibida la reproducción no autorizada.</p>

              <h4 style={{ color: '#38bdf8', marginTop: '14px', marginBottom: '6px' }}>4. Contratos Digitales y Compromisos Económicos</h4>
              <p>Los contratos suscritos electrónicamente en el módulo de mensajería y trámites son de carácter vinculante entre arrendador/vendedor y arrendatario/comprador. Los registros de pago y auditoría en Blockchain garantizan la inmutabilidad de los acuerdos alcanzados.</p>

              <h4 style={{ color: '#38bdf8', marginTop: '14px', marginBottom: '6px' }}>5. Protección de Datos y Privacidad</h4>
              <p>Inmobiliaria Nobleve implementa cifrado de extremo a extremo en credenciales y resguarda la privacidad de las partes conforme a los estándares internacionales de seguridad de la información.</p>
            </div>

            {/* Footer del Modal */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={() => {
                  setAceptaTerminos(true);
                  setModalTerminosAbierto(false);
                }}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Aceptar y Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registro;