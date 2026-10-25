import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';

const STORAGE_KEY = 'cookie_consent';

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const responder = (valor) => {
    localStorage.setItem(STORAGE_KEY, valor);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      style={{
        position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)',
        zIndex: 10000, maxWidth: '560px', width: 'calc(100% - 2rem)',
        background: 'rgba(15, 23, 42, 0.97)', border: '1px solid rgba(56, 189, 248, 0.35)',
        borderRadius: '14px', padding: '1rem 1.25rem',
        boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <Cookie size={20} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5' }}>
          Usamos almacenamiento local para tu sesión y preferencias (esencial).
          Consulta nuestra <Link to="/cookies" style={{ color: '#38bdf8' }}>Política de Cookies</Link>.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => responder('rechazado')}
          style={{
            background: 'transparent', border: '1px solid #475569', color: '#94a3b8',
            padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem',
          }}
        >
          Solo esenciales
        </button>
        <button
          onClick={() => responder('aceptado')}
          style={{
            background: 'linear-gradient(135deg, #0284c7, #38bdf8)', border: 'none',
            color: 'white', padding: '7px 14px', borderRadius: '8px',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
          }}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
};

export default CookieBanner;
