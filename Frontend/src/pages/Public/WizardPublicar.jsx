import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Building2, Map, Briefcase, Warehouse, Store, Camera, X, CheckCircle2, ChevronLeft, ImagePlus } from 'lucide-react';
import api from '../../services/api';
import Stepper from '../../components/Stepper';

const TIPO_ICONS = [Home, Building2, Map, Briefcase, Warehouse, Store];
const tipoIcon = (nombre = '', i = 0) => {
  const n = nombre.toLowerCase();
  if (n.includes('casa')) return Home;
  if (n.includes('depart')) return Building2;
  if (n.includes('terreno') || n.includes('lote')) return Map;
  if (n.includes('oficina')) return Briefcase;
  if (n.includes('galp') || n.includes('bodega')) return Warehouse;
  if (n.includes('local') || n.includes('comerc')) return Store;
  return TIPO_ICONS[i % TIPO_ICONS.length];
};

const OPERACIONES = [
  { id: 'alquiler', label: 'Alquilar', desc: 'Cobrar mensualmente' },
  { id: 'venta', label: 'Vender', desc: 'Venta definitiva' },
  { id: 'anticretico', label: 'Anticrético', desc: 'Anticrético' },
];

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '10px',
  border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
  color: 'var(--color-text)', fontSize: '1rem', boxSizing: 'border-box', outline: 'none',
};
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--color-text)', fontSize: '0.9rem' };
const hintStyle = { fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '4px' };

const WizardPublicar = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [paso, setPaso] = useState(1);
  const [tipos, setTipos] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [publicado, setPublicado] = useState(false);

  const [tipo, setTipo] = useState(null);          // objeto tipo {id, nombre}
  const [operacion, setOperacion] = useState('alquiler');
  const [form, setForm] = useState({
    titulo: '', ciudad: '', zona: '', calle: '', referencia: '',
    precio: '', habitaciones: '', banos: '', superficie: '', descripcion: '',
  });
  const [fotos, setFotos] = useState([]);          // File[]
  const [previews, setPreviews] = useState([]);    // object URLs

  useEffect(() => {
    api.get('/inmuebles/tipos/').then(r => setTipos(r.data.results || r.data)).catch(() => {});
    api.get('/inmuebles/ciudades/').then(r => setCiudades(r.data.results || r.data)).catch(() => {});
    return () => previews.forEach(u => URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const agregarFotos = (files) => {
    const nuevos = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!nuevos.length) return;
    setFotos(f => [...f, ...nuevos]);
    setPreviews(p => [...p, ...nuevos.map(f => URL.createObjectURL(f))]);
  };
  const quitarFoto = (i) => {
    URL.revokeObjectURL(previews[i]);
    setFotos(f => f.filter((_, j) => j !== i));
    setPreviews(p => p.filter((_, j) => j !== i));
  };

  const puedeAvanzar = () => {
    if (paso === 1) return !!tipo;
    if (paso === 2) return form.ciudad.trim() && form.zona.trim();
    if (paso === 3) return !!operacion && parseFloat(form.precio) > 0;
    if (paso === 4) return true;
    return true;
  };

  const tituloFinal = form.titulo.trim() ||
    `${tipo?.nombre || 'Propiedad'} en ${form.zona || form.ciudad}`;

  const publicar = async () => {
    setGuardando(true); setError('');
    try {
      const res = await api.post('/inmuebles/panel/lista/', {
        titulo: tituloFinal,
        descripcion: form.descripcion,
        tipo: tipo.id,
        direccion: { ciudad: form.ciudad, zona: form.zona, calle: form.calle, referencia: form.referencia },
        habitaciones: parseInt(form.habitaciones) || 0,
        banos: parseInt(form.banos) || 0,
        superficie: form.superficie === '' ? null : parseFloat(form.superficie),
        estado: 'disponible',
      });
      const inmId = res.data.id;

      await api.post('/inmuebles/panel/publicaciones/', {
        inmueble: inmId,
        tipo_oferta: operacion,
        precio: parseFloat(form.precio),
        estado: 'activa',
      }).catch(() => {});

      for (let i = 0; i < fotos.length; i++) {
        const fd = new FormData();
        fd.append('inmueble', inmId);
        fd.append('archivo', fotos[i]);
        fd.append('principal', i === 0 ? 'true' : 'false');
        fd.append('tipo', 'imagen');
        await api.post('/inmuebles/multimedia/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      setPublicado(true);
    } catch (err) {
      const resp = err.response?.data;
      setError(resp && typeof resp === 'object'
        ? Object.entries(resp).map(([k, v]) => `${Array.isArray(v) ? v.join(' ') : v}`).join(' | ')
        : 'No se pudo publicar. Revisa los datos e intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const btnPrimario = {
    background: 'var(--color-primary)', color: '#fff', border: 'none',
    padding: '13px 30px', borderRadius: '10px', fontWeight: 700, fontSize: '1rem',
    cursor: 'pointer', opacity: 1,
  };
  const btnSecundario = {
    background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)', padding: '13px 24px',
    borderRadius: '10px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
  };
  const cardSel = (sel) => ({
    padding: '18px 12px', borderRadius: '14px', cursor: 'pointer', textAlign: 'center',
    border: sel ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
    background: sel ? 'rgba(14,165,233,0.12)' : 'var(--color-surface)',
    transition: 'all 0.15s',
  });

  if (publicado) {
    return (
      <div className="propiedades-page">
        <div className="propiedades-content" style={{ maxWidth: '560px', textAlign: 'center', paddingTop: '4rem' }}>
          <CheckCircle2 size={72} color="#34d399" style={{ margin: '0 auto 16px' }} />
          <h1 style={{ color: 'var(--color-text)', fontSize: '1.6rem', margin: '0 0 8px' }}>¡Tu anuncio está publicado!</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '28px' }}>
            Te avisaremos cuando alguien pida una visita. Para que tu anuncio tenga el sello
            "Documento revisado", puedes subir el título de propiedad desde Mis propiedades.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button style={btnSecundario} onClick={() => navigate('/mis-inmuebles')}>Ver mis propiedades</button>
            <button style={btnPrimario} onClick={() => navigate('/propiedades')}>Ver cómo se ve</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="propiedades-page">
      <div className="propiedades-content" style={{ maxWidth: '640px' }}>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--color-text)', margin: '0 0 4px' }}>Publicar propiedad</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 24px', fontSize: '0.9rem' }}>
          Solo lo esencial. Puedes completar detalles después.
        </p>

        <Stepper
          current={paso}
          total={5}
          label={['¿Qué publicas?', '¿Dónde está?', '¿Cuánto pides?', 'Fotos', 'Revisar'][paso - 1]}
        />

        {/* ── Paso 1: Tipo ─────────────────────────────────────────── */}
        {paso === 1 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              {tipos.map((t, i) => {
                const Icon = tipoIcon(t.nombre, i);
                const sel = tipo?.id === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => setTipo(t)} style={{ ...cardSel(sel), border: cardSel(sel).border }}>
                    <Icon size={28} color={sel ? '#38bdf8' : 'var(--color-text-secondary)'} style={{ margin: '0 auto 8px' }} />
                    <div style={{ color: sel ? '#38bdf8' : 'var(--color-text)', fontWeight: 600, fontSize: '0.9rem' }}>{t.nombre}</div>
                  </button>
                );
              })}
            </div>
            {tipos.length === 0 && <p style={hintStyle}>Cargando tipos...</p>}
          </div>
        )}

        {/* ── Paso 2: Ubicación ────────────────────────────────────── */}
        {paso === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle} htmlFor="wz-ciudad">Ciudad</label>
              <input id="wz-ciudad" list="wz-ciudades" style={inputStyle} value={form.ciudad} onChange={set('ciudad')} placeholder="Ej: Santa Cruz" />
              <datalist id="wz-ciudades">{ciudades.map(c => <option key={c.id || c} value={c.nombre || c} />)}</datalist>
            </div>
            <div>
              <label style={labelStyle} htmlFor="wz-zona">Zona o barrio</label>
              <input id="wz-zona" style={inputStyle} value={form.zona} onChange={set('zona')} placeholder="Ej: Equipetrol" />
            </div>
            <div>
              <label style={labelStyle} htmlFor="wz-calle">Calle y número <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(opcional)</span></label>
              <input id="wz-calle" style={inputStyle} value={form.calle} onChange={set('calle')} placeholder="Ej: Av. Los Tajibos #123" />
            </div>
          </div>
        )}

        {/* ── Paso 3: Operación + precio ───────────────────────────── */}
        {paso === 3 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {OPERACIONES.map(op => {
                const sel = operacion === op.id;
                return (
                  <button key={op.id} type="button" onClick={() => setOperacion(op.id)} style={cardSel(sel)}>
                    <div style={{ color: sel ? '#38bdf8' : 'var(--color-text)', fontWeight: 700, fontSize: '0.95rem' }}>{op.label}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', marginTop: '4px' }}>{op.desc}</div>
                  </button>
                );
              })}
            </div>
            <div>
              <label style={labelStyle} htmlFor="wz-precio">Precio en bolivianos {operacion === 'alquiler' ? '(por mes)' : ''}</label>
              <input id="wz-precio" type="number" min="0" step="50" style={{ ...inputStyle, fontSize: '1.2rem', fontWeight: 700 }}
                value={form.precio} onChange={set('precio')} placeholder="Ej: 3500" />
              <p style={hintStyle}>Puedes cambiarlo después desde Mis propiedades.</p>
            </div>
          </div>
        )}

        {/* ── Paso 4: Fotos + detalles ─────────────────────────────── */}
        {paso === 4 && (
          <div>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%', padding: '32px', borderRadius: '14px', cursor: 'pointer',
                border: '2px dashed var(--color-border)', background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '8px', fontSize: '0.95rem',
              }}>
              <ImagePlus size={32} color="var(--color-primary)" />
              <strong style={{ color: 'var(--color-text)' }}>Toca para subir fotos</strong>
              <span style={{ fontSize: '0.8rem' }}>Las fotos bonitas consiguen más visitas</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple hidden
              onChange={e => { agregarFotos(e.target.files); e.target.value = ''; }} />

            {previews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px', marginTop: '14px' }}>
                {previews.map((src, i) => (
                  <div key={src} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: i === 0 ? '2px solid var(--color-primary)' : '1px solid var(--color-border)' }}>
                    <img src={src} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '90px', objectFit: 'cover', display: 'block' }} />
                    {i === 0 && <span style={{ position: 'absolute', bottom: 4, left: 4, background: 'var(--color-primary)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: '6px' }}>Portada</span>}
                    <button type="button" onClick={() => quitarFoto(i)} aria-label={`Quitar foto ${i + 1}`}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {previews.length === 0 && <p style={hintStyle}>Opcional, pero los anuncios con fotos reciben muchas más visitas.</p>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '20px' }}>
              <div>
                <label style={{ ...labelStyle, fontSize: '0.82rem' }} htmlFor="wz-hab">Habitaciones</label>
                <input id="wz-hab" type="number" min="0" style={inputStyle} value={form.habitaciones} onChange={set('habitaciones')} placeholder="0" />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: '0.82rem' }} htmlFor="wz-ban">Baños</label>
                <input id="wz-ban" type="number" min="0" style={inputStyle} value={form.banos} onChange={set('banos')} placeholder="0" />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: '0.82rem' }} htmlFor="wz-sup">Superficie m²</label>
                <input id="wz-sup" type="number" min="0" style={inputStyle} value={form.superficie} onChange={set('superficie')} placeholder="0" />
              </div>
            </div>
          </div>
        )}

        {/* ── Paso 5: Revisar y publicar ───────────────────────────── */}
        {paso === 5 && (
          <div>
            <div>
              <label style={labelStyle} htmlFor="wz-titulo">Título de tu anuncio</label>
              <input id="wz-titulo" style={inputStyle} value={form.titulo} onChange={set('titulo')} placeholder={tituloFinal} />
              <p style={hintStyle}>Si lo dejas vacío usaremos: {tituloFinal}</p>
            </div>
            <div style={{ marginTop: '14px' }}>
              <label style={labelStyle} htmlFor="wz-desc">Descripción <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(opcional)</span></label>
              <textarea id="wz-desc" rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={form.descripcion} onChange={set('descripcion')}
                placeholder="Ej: Casa amplia con patio, cerca del mercado..." />
            </div>

            <div style={{
              marginTop: '20px', padding: '18px', borderRadius: '12px',
              background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {previews[0]
                  ? <img src={previews[0]} alt="Portada" style={{ width: '72px', height: '56px', objectFit: 'cover', borderRadius: '8px' }} />
                  : <div style={{ width: '72px', height: '56px', borderRadius: '8px', background: 'var(--color-bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={20} color="var(--color-text-muted)" /></div>}
                <div>
                  <div style={{ color: 'var(--color-text)', fontWeight: 700 }}>{tituloFinal}</div>
                  <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem' }}>
                    {tipo?.nombre} · {form.zona}, {form.ciudad}
                  </div>
                  <div style={{ color: '#38bdf8', fontWeight: 700, marginTop: '2px' }}>
                    Bs {parseFloat(form.precio || 0).toLocaleString('es-BO')}{operacion === 'alquiler' ? '/mes' : ''} · {OPERACIONES.find(o => o.id === operacion)?.label}
                  </div>
                </div>
              </div>
            </div>

            {error && <p role="alert" style={{ color: '#f87171', fontSize: '0.88rem', marginTop: '14px' }}>{error}</p>}
          </div>
        )}

        {/* ── Navegación del wizard ────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px', gap: '12px' }}>
          {paso > 1
            ? <button type="button" style={btnSecundario} onClick={() => setPaso(p => p - 1)}><ChevronLeft size={16} style={{ verticalAlign: '-3px' }} /> Atrás</button>
            : <button type="button" style={btnSecundario} onClick={() => navigate('/mis-inmuebles')}>Cancelar</button>}
          {paso < 5 ? (
            <button type="button" style={{ ...btnPrimario, opacity: puedeAvanzar() ? 1 : 0.45, cursor: puedeAvanzar() ? 'pointer' : 'not-allowed' }}
              disabled={!puedeAvanzar()} onClick={() => setPaso(p => p + 1)}>
              Siguiente
            </button>
          ) : (
            <button type="button" style={btnPrimario} disabled={guardando} onClick={publicar}>
              {guardando ? 'Publicando...' : 'Publicar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WizardPublicar;
