import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Bed, 
  Utensils, 
  Armchair, 
  Camera, 
  Upload, 
  FileText,
  Boxes,
  Activity,
  Layers,
  ArrowLeft
} from 'lucide-react';

const AuditoriaCheckInOut = () => {
  const [searchParams] = useSearchParams();
  const inmuebleIdQuery = searchParams.get('inmuebleId');

  const [inmuebles, setInmuebles] = useState([]);
  const [inmuebleSeleccionado, setInmuebleSeleccionado] = useState(inmuebleIdQuery || '');
  const [infoInmuebleActual, setInfoInmuebleActual] = useState(null);
  const [auditorias, setAuditorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tipoAccion, setTipoAccion] = useState('checkin'); // 'checkin' o 'checkout'
  const [dictamenReciente, setDictamenReciente] = useState(null);

  // Ambientes a capturar (inicialmente vacíos hasta cargar las fotos reales del inmueble)
  const [fotos, setFotos] = useState({});

  const handleSubirFotoPropia = (ambiente, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setFotos(prev => ({
            ...prev,
            [ambiente]: compressedBase64
          }));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (inmuebleIdQuery) {
      setInmuebleSeleccionado(inmuebleIdQuery);
      cargarDetalleInmueble(inmuebleIdQuery);
    } else {
      cargarInmuebles();
    }
  }, [inmuebleIdQuery]);

  const cargarInmuebles = async () => {
    try {
      const res = await api.get('/inmuebles/lista/');
      const items = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setInmuebles(items);
      if (items.length > 0) {
        const idInicial = inmuebleIdQuery || items[0].id;
        setInmuebleSeleccionado(idInicial);
        cargarDetalleInmueble(idInicial);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cargarDetalleInmueble = async (id) => {
    try {
      // Obtenemos el detalle completo con toda su multimedia y fotos reales
      const res = await api.get(`/inmuebles/lista/${id}/`);
      const inm = res.data;
      setInfoInmuebleActual(inm);
      const media = inm.multimedia || [];
      const nuevasFotos = {};

      if (media.length > 0) {
        media.forEach((m, idx) => {
          if (m.archivo) {
            const key = m.descripcion?.trim() ? m.descripcion.trim() : `Ambiente ${idx + 1}`;
            nuevasFotos[key] = m.archivo;
          }
        });
      }
      setFotos(nuevasFotos);
    } catch (e) {
      console.error('Error cargando detalle de inmueble:', e);
    }
  };

  const handleCambioInmueble = (id) => {
    setInmuebleSeleccionado(id);
    cargarDetalleInmueble(id);
  };

  const ejecutarAuditoriaIA = async () => {
    if (!inmuebleSeleccionado) return;
    setLoading(true);
    setDictamenReciente(null);

    const fotosPayload = Object.entries(fotos).map(([ambiente, url]) => ({
      ambiente,
      foto_url: url
    }));

    try {
      let res;
      if (tipoAccion === 'checkin') {
        res = await api.post('/inmuebles/auditorias/iniciar-checkin/', {
          inmueble: inmuebleSeleccionado,
          fotos: fotosPayload,
          monto_garantia_base: 3500.0
        });
      } else {
        res = await api.post('/inmuebles/auditorias/ejecutar-checkout/', {
          inmueble: inmuebleSeleccionado,
          fotos: fotosPayload
        });
      }

      setDictamenReciente(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error procesando la auditoría');
    } finally {
      setLoading(false);
    }
  };

  const renderIconoAmbiente = (ambiente) => {
    const ambLower = ambiente.toLowerCase();
    if (ambLower.includes('sala')) return <Armchair size={15} color="#38bdf8" />;
    if (ambLower.includes('cocina')) return <Utensils size={15} color="#38bdf8" />;
    if (ambLower.includes('dormitorio') || ambLower.includes('habitacion')) return <Bed size={15} color="#38bdf8" />;
    if (ambLower.includes('luz') || ambLower.includes('medidor')) return <Zap size={15} color="#38bdf8" />;
    return <Layers size={15} color="#38bdf8" />;
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Botón Volver a la Propiedad si venimos de ella */}
      {inmuebleIdQuery && (
        <Link 
          to={`/propiedades/${inmuebleIdQuery}`} 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            color: '#38bdf8', 
            textDecoration: 'none', 
            marginBottom: '16px',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          <ArrowLeft size={16} /> Volver a los detalles de la propiedad
        </Link>
      )}

      {/* Encabezado Principal en Español Claro */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'rgba(14,165,233,0.15)', padding: '10px', borderRadius: '10px', color: '#38bdf8' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: 0 }}>
                  Auditoría de Inmueble y Devolución de Garantía
                </h1>
                {infoInmuebleActual && (
                  <div style={{ color: '#38bdf8', fontSize: '0.95rem', fontWeight: 600, marginTop: '2px' }}>
                    Propiedad: {infoInmuebleActual.titulo}
                  </div>
                )}
              </div>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '8px', marginBottom: 0 }}>
              Revisión visual automática del mobiliario, paredes y medidores para la entrega y devolución del alquiler.
            </p>
          </div>

          {/* Opciones de Entrada / Salida */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Si no vino con un ID fijo en la URL, permitir seleccionar */}
            {!inmuebleIdQuery && inmuebles.length > 1 && (
              <select
                value={inmuebleSeleccionado}
                onChange={(e) => handleCambioInmueble(e.target.value)}
                style={{
                  background: '#090d16',
                  border: '1px solid #334155',
                  color: 'white',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.9rem'
                }}
              >
                {inmuebles.map((inm) => (
                  <option key={inm.id} value={inm.id}>{inm.titulo}</option>
                ))}
              </select>
            )}

            <div style={{ display: 'flex', background: '#090d16', padding: '4px', borderRadius: '10px', border: '1px solid #334155' }}>
              <button
                onClick={() => setTipoAccion('checkin')}
                style={{
                  background: tipoAccion === 'checkin' ? '#0ea5e9' : 'transparent',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Revisión de Entrada
              </button>
              <button
                onClick={() => setTipoAccion('checkout')}
                style={{
                  background: tipoAccion === 'checkout' ? '#0ea5e9' : 'transparent',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                Revisión de Salida
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Ambientes a Inspeccionar */}
      {Object.keys(fotos).length === 0 ? (
        <div style={{
          background: '#1e293b',
          border: '1px dashed #475569',
          borderRadius: '16px',
          padding: '40px 20px',
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          <div style={{ color: '#38bdf8', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
            <Camera size={40} />
          </div>
          <h4 style={{ color: '#f8fafc', margin: '0 0 8px 0', fontSize: '1.1rem' }}>Este inmueble aún no tiene fotos subidas</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 16px 0' }}>Sube las fotos de los ambientes para realizar la auditoría con IA:</p>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['sala', 'cocina', 'dormitorio_1', 'medidor_luz'].map((amb) => {
              const nombres = { sala: 'Sala', cocina: 'Cocina', dormitorio_1: 'Dormitorio', medidor_luz: 'Medidor Luz' };
              return (
                <label key={amb} style={{
                  background: 'rgba(14,165,233,0.15)',
                  border: '1px solid #0ea5e9',
                  color: '#38bdf8',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Upload size={14} />
                  <span>Subir {nombres[amb]}</span>
                  <input type="file" accept="image/*" onChange={(e) => handleSubirFotoPropia(amb, e)} style={{ display: 'none' }} />
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {Object.entries(fotos).map(([ambiente, url], index) => {
            const esMedidor = ambiente.toLowerCase().includes('medidor') || ambiente.toLowerCase().includes('luz') || ambiente.toLowerCase().includes('agua');
            const tituloMostrado = ambiente.startsWith('Foto ') || ambiente.startsWith('ambiente_') ? `Ambiente ${index + 1}` : ambiente;

            return (
              <div key={ambiente} style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)'
              }}>
                <div style={{ position: 'relative', height: '160px' }}>
                  <img src={url} alt={ambiente} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(6px)',
                    color: '#38bdf8',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {renderIconoAmbiente(ambiente)}
                    <span>{tituloMostrado}</span>
                  </span>
                </div>
                <div style={{ padding: '14px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>
                    {esMedidor ? 'Lectura automática de medidor' : 'Inspección de inventario y estado visual'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.82rem', fontWeight: 'bold' }}>
                      <CheckCircle2 size={16} />
                      Foto del inmueble
                    </div>
                    <label style={{
                      background: 'rgba(14,165,233,0.15)',
                      border: '1px solid rgba(14,165,233,0.4)',
                      color: '#38bdf8',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Upload size={13} />
                      <span>Cambiar / Subir</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleSubirFotoPropia(ambiente, e)} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Botón de Ejecución */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <button
          onClick={ejecutarAuditoriaIA}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            color: 'white',
            border: 'none',
            padding: '14px 36px',
            borderRadius: '12px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 10px 20px -5px rgba(14,165,233,0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {loading ? (
            <>
              <div style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              Procesando con Inteligencia Artificial...
            </>
          ) : (
            <>
              <Activity size={20} />
              {tipoAccion === 'checkin' ? 'Registrar Entrada con IA (Check-in)' : 'Ejecutar Dictamen Pericial de Salida (Check-out)'}
            </>
          )}
        </button>
      </div>

      {/* Dictamen Pericial Resultante con Diseño Amigable y Claro */}
      {dictamenReciente && (
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid #38bdf8',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
          marginTop: '20px'
        }}>
          {/* Encabezado del Dictamen */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '10px', borderRadius: '12px' }}>
                <FileText size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f8fafc', margin: 0 }}>
                  Resultado de la Auditoría Pericial
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Auditoría {dictamenReciente.tipo === 'checkin' ? 'Inicial (Check-in)' : 'Final de Salida (Check-out)'}
                </span>
              </div>
            </div>

            <div style={{
              background: dictamenReciente.total_deducciones > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
              border: `1px solid ${dictamenReciente.total_deducciones > 0 ? '#ef4444' : '#10b981'}`,
              color: dictamenReciente.total_deducciones > 0 ? '#f87171' : '#34d399',
              padding: '6px 16px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '0.85rem'
            }}>
              {dictamenReciente.total_deducciones > 0 ? 'DEDUCCIONES APLICADAS' : 'TODO EN ORDEN (SIN DEDUCCIONES)'}
            </div>
          </div>

          {/* Desglose Visual en 3 Tarjetas Claras */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#090d16', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>1. Garantía en Custodia</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#f8fafc' }}>
                Bs. {Number(dictamenReciente.monto_garantia_base).toFixed(2)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Monto total depositado</div>
            </div>

            <div style={{ background: '#090d16', padding: '16px', borderRadius: '12px', border: '1px solid #ef4444' }}>
              <div style={{ fontSize: '0.8rem', color: '#f87171', marginBottom: '4px' }}>2. Total Descontado</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ef4444' }}>
                - Bs. {Number(dictamenReciente.total_deducciones).toFixed(2)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '4px' }}>Por faltantes, daños o consumo</div>
            </div>

            <div style={{ background: '#090d16', padding: '16px', borderRadius: '12px', border: '1px solid #38bdf8' }}>
              <div style={{ fontSize: '0.8rem', color: '#38bdf8', marginBottom: '4px' }}>3. Dinero a Devolver</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38bdf8' }}>
                Bs. {Number(dictamenReciente.monto_a_reembolsar).toFixed(2)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '4px' }}>Saldo neto a transferir al inquilino</div>
            </div>
          </div>

          {/* Desglose Detallado Ítem por Ítem */}
          <div style={{ background: '#090d16', borderRadius: '12px', border: '1px solid #334155', padding: '18px' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', color: '#cbd5e1', fontWeight: 600 }}>
              Detalle del Análisis por IA:
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Ítem: Mobiliario */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#1e293b', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ color: Number(dictamenReciente.deduccion_faltantes) > 0 ? '#ef4444' : '#10b981' }}>
                    <Boxes size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>Inventario de Muebles y Equipos</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {Number(dictamenReciente.deduccion_faltantes) > 0 ? 'Se detectaron objetos faltantes respecto al Check-in' : 'Todos los muebles y electrodomésticos presentes'}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: Number(dictamenReciente.deduccion_faltantes) > 0 ? '#ef4444' : '#10b981' }}>
                  {Number(dictamenReciente.deduccion_faltantes) > 0 ? `- Bs. ${Number(dictamenReciente.deduccion_faltantes).toFixed(2)}` : 'Bs. 0.00'}
                </div>
              </div>

              {/* Ítem: Estado de Paredes y Daños */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#1e293b', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ color: Number(dictamenReciente.deduccion_danos) > 0 ? '#ef4444' : '#10b981' }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>Estado de Paredes y Daños Físicos</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {Number(dictamenReciente.deduccion_danos) > 0 ? 'Se detectaron fisuras, manchas o alteraciones estructurales' : 'Paredes y acabados sin daños estructurales'}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: Number(dictamenReciente.deduccion_danos) > 0 ? '#ef4444' : '#10b981' }}>
                  {Number(dictamenReciente.deduccion_danos) > 0 ? `- Bs. ${Number(dictamenReciente.deduccion_danos).toFixed(2)}` : 'Bs. 0.00'}
                </div>
              </div>

              {/* Ítem: Servicios Básicos */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#1e293b', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ color: Number(dictamenReciente.deduccion_servicios) > 0 ? '#ef4444' : '#10b981' }}>
                    <Zap size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>Consumo de Servicios de Luz y Agua</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Lectura de medidores comparada automáticamente
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: Number(dictamenReciente.deduccion_servicios) > 0 ? '#ef4444' : '#10b981' }}>
                  {Number(dictamenReciente.deduccion_servicios) > 0 ? `- Bs. ${Number(dictamenReciente.deduccion_servicios).toFixed(2)}` : 'Bs. 0.00'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditoriaCheckInOut;

