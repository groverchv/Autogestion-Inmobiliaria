import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, X, Send, Home, Mic, MicOff } from 'lucide-react';
import api from '../services/api';
import useStore from '../store/store';

const SUGERENCIAS_INICIALES = [
  'Buscar inmuebles en venta',
  '¿Cómo va mi estado?',
  '¿Cómo capturo un recorrido 360°?',
  '¿Cómo publico mi propiedad?',
];

const ANCHO_PANEL = 380;

const estilos = {
  contenedor: { position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 9990 },
  burbuja: { width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-primary, #1e3a5f)', color: '#fff', boxShadow: '0 6px 20px rgba(0,0,0,0.4)', transition: 'transform 0.15s' },
  panel: { position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 9990, width: `min(${ANCHO_PANEL}px, 100vw)`, display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(56,189,248,0.25)', background: 'rgba(15,23,42,0.98)', boxShadow: '-8px 0 30px rgba(0,0,0,0.5)' },
  header: { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.7rem 0.9rem', background: '#16233c', color: '#fff' },
  headerIcono: { width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2563eb', flexShrink: 0 },
  bandeja: { flex: 1, overflowY: 'auto', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  msgBot: { alignSelf: 'flex-start', maxWidth: '85%', padding: '0.55rem 0.8rem', borderRadius: '14px', background: '#1e293b', border: '1px solid rgba(148,163,184,0.15)', color: '#e2e8f0', fontSize: '0.83rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' },
  msgUsuario: { alignSelf: 'flex-end', maxWidth: '85%', padding: '0.55rem 0.8rem', borderRadius: '14px', background: '#1d4ed8', color: '#fff', fontSize: '0.83rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' },
  chip: { border: '1px solid rgba(96,165,250,0.4)', borderRadius: '999px', background: 'transparent', color: '#93c5fd', fontSize: '0.72rem', padding: '0.25rem 0.6rem', cursor: 'pointer' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '0.35rem' },
  tarjeta: { display: 'block', textDecoration: 'none', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '10px', padding: '0.5rem 0.7rem', background: 'rgba(30,58,95,0.5)', color: '#e2e8f0', fontSize: '0.78rem' },
  form: { display: 'flex', gap: '0.5rem', padding: '0.7rem', borderTop: '1px solid rgba(148,163,184,0.15)', background: 'rgba(15,23,42,0.9)' },
  input: { flex: 1, borderRadius: '10px', border: '1px solid rgba(148,163,184,0.25)', background: '#0f172a', color: '#e2e8f0', padding: '0.5rem 0.7rem', fontSize: '0.83rem', outline: 'none' },
  btnEnviar: { border: 'none', borderRadius: '10px', background: '#2563eb', color: '#fff', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  escribiendo: { fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' },
};

/** Widget del asistente virtual operativo: panel anclado a la derecha que
 *  desplaza el contenido en escritorio (como el carrito lateral), sin tapar nada. */
const AgenteWidget = () => {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const location = useLocation();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [sugerencias, setSugerencias] = useState([]);
  const [tarjetas, setTarjetas] = useState([]);
  const [entrada, setEntrada] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const reconocimientoRef = useRef(null);
  const bandejaRef = useRef(null);

  // Contexto de página: si estamos en /propiedades/:id, el agente sabe de qué casa hablamos
  const match = location.pathname.match(/^\/propiedades\/(\d+)/);
  const inmuebleId = match ? Number(match[1]) : null;

  // Panel anclado a la derecha: en escritorio desplaza el contenido para no tapar nada
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const acomodar = () => {
      document.body.style.paddingRight = abierto && mq.matches ? `${ANCHO_PANEL}px` : '';
    };
    acomodar();
    mq.addEventListener('change', acomodar);
    return () => {
      mq.removeEventListener('change', acomodar);
      document.body.style.paddingRight = '';
    };
  }, [abierto]);

  const scrollAbajo = () => {
    requestAnimationFrame(() => {
      bandejaRef.current?.scrollTo({ top: bandejaRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  const alternar = () => {
    setAbierto((v) => !v);
    if (abierto) reconocimientoRef.current?.stop();
    if (!abierto && mensajes.length === 0) {
      setMensajes([{
        de: 'bot',
        texto: '¡Hola! Soy el asistente de Inmobiliaria 360. Puedo buscar propiedades, agendar visitas, mostrar tu estado o explicarte cómo usar la plataforma. Puedes escribir o tocarme el micrófono y hablarme.',
      }]);
      setSugerencias(SUGERENCIAS_INICIALES);
    }
  };

  // Dictado por voz (Web Speech API; Chrome/Edge, en producción requiere HTTPS)
  const micDisponible = typeof window !== 'undefined'
    && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const alternarMicrofono = () => {
    if (escuchando) {
      reconocimientoRef.current?.stop();
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    reconocimientoRef.current = rec;
    rec.lang = 'es-ES';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const texto = e.results[0]?.[0]?.transcript ?? '';
      setEscuchando(false);
      if (texto) {
        setEntrada(texto);
        enviar(texto);
      }
    };
    rec.onend = () => setEscuchando(false);
    rec.onerror = () => setEscuchando(false);
    rec.start();
    setEscuchando(true);
  };

  const enviar = useCallback(async (textoOverride) => {
    const pregunta = (textoOverride ?? entrada).trim();
    if (!pregunta || escribiendo) return;
    setEntrada('');
    setSugerencias([]);
    setTarjetas([]);
    const nuevos = [...mensajes, { de: 'usuario', texto: pregunta }];
    setMensajes(nuevos);
    setEscribiendo(true);
    try {
      const { data } = await api.post('/inmuebles/agente/chat/', {
        mensaje: pregunta,
        historial: nuevos.slice(-8).map((m) => ({
          rol: m.de === 'usuario' ? 'usuario' : 'agente',
          texto: m.texto.slice(0, 800),
        })),
        contexto: inmuebleId ? { inmueble_id: inmuebleId } : {},
      });
      setMensajes((prev) => [...prev, { de: 'bot', texto: data.texto || 'Sin respuesta.' }]);
      if (Array.isArray(data.sugerencias) && data.sugerencias.length) {
        setSugerencias(data.sugerencias.slice(0, 3));
      }
      if (Array.isArray(data.tarjetas) && data.tarjetas.length) {
        setTarjetas(data.tarjetas);
      }
      if (data?.accion?.tipo === 'cita') {
        setMensajes((prev) => [...prev, { de: 'bot', texto: 'Tu visita quedó registrada — la verás en "Mi agenda".' }]);
      }
    } catch {
      setMensajes((prev) => [...prev, {
        de: 'bot',
        texto: 'El asistente no está disponible ahora. Intenta de nuevo en un momento.',
      }]);
    }
    setEscribiendo(false);
    scrollAbajo();
  }, [entrada, escribiendo, mensajes, inmuebleId]);

  useEffect(scrollAbajo, [mensajes, tarjetas]);

  if (!isAuthenticated) return null;

  return (
    <>
      {abierto && (
        <aside style={estilos.panel} aria-label="Asistente virtual">
          <div style={estilos.header}>
            <span style={estilos.headerIcono}><Bot size={19} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Asistente virtual</div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                {inmuebleId ? 'Viendo propiedad — puedes preguntar por ella' : 'Busca, agenda, consulta'}
              </div>
            </div>
            <button onClick={alternar} aria-label="Cerrar asistente" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>

          <div ref={bandejaRef} style={estilos.bandeja}>
            {mensajes.map((m, i) => (
              <div key={i} style={m.de === 'usuario' ? estilos.msgUsuario : estilos.msgBot}>
                {m.texto}
              </div>
            ))}
            {tarjetas.map((t) => (
              <Link key={t.inmueble_id} to={`/propiedades/${t.inmueble_id}`} style={estilos.tarjeta} onClick={() => setAbierto(false)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <Home size={14} /> {t.titulo}
                </div>
                <div style={{ color: '#93c5fd', marginTop: '2px' }}>
                  {t.tipo_oferta} · {Number(t.precio).toLocaleString()} USD{t.zona ? ` · ${t.zona}` : ''}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                  {t.habitaciones} hab · {t.banos} baños
                </div>
              </Link>
            ))}
            {escuchando && <div style={{ ...estilos.escribiendo, color: '#f87171' }}>Escuchando… habla ahora.</div>}
            {escribiendo && <div style={estilos.escribiendo}>El asistente está escribiendo…</div>}
            {sugerencias.length > 0 && !escribiendo && (
              <div style={estilos.chips}>
                {sugerencias.map((s) => (
                  <button key={s} style={estilos.chip} onClick={() => enviar(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>

          <form style={estilos.form} onSubmit={(e) => { e.preventDefault(); enviar(); }}>
            <input
              style={estilos.input}
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder={escuchando ? 'Escuchando…' : 'Escribe o dicta tu consulta…'}
              aria-label="Escribe tu consulta"
            />
            {micDisponible && (
              <button
                type="button"
                onClick={alternarMicrofono}
                aria-label={escuchando ? 'Detener dictado' : 'Dictar por voz'}
                style={{
                  ...estilos.btnEnviar,
                  background: escuchando ? '#ef4444' : '#334155',
                }}
              >
                {escuchando ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            <button type="submit" style={estilos.btnEnviar} aria-label="Enviar">
              <Send size={16} />
            </button>
          </form>
        </aside>
      )}

      {!abierto && (
        <div style={estilos.contenedor}>
          <button
            onClick={alternar}
            style={estilos.burbuja}
            aria-label="Abrir asistente virtual"
          >
            <Bot size={26} />
          </button>
        </div>
      )}
    </>
  );
};

export default AgenteWidget;
