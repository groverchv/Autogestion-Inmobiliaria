import { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, AlertTriangle, Home, User, Sparkles, Send, Bot, RotateCcw, List, Ban, ShieldCheck, AlertOctagon, Zap, Wifi, Calendar, RefreshCw, AlertCircle, BookOpen, Building2, WifiOff } from 'lucide-react';

import Modal from '../../components/Modal';
import BlockchainAuditTrail from '../../components/BlockchainAuditTrail';
import useAlertConfirm from '../../hooks/useAlertConfirm';
import useAuth from '../../hooks/useAuth';
import contratoService from '../../services/contratoService';
import './Propiedades.css';

const estadoConfig = {
  borrador: { color: '#94a3b8', bg: '#f1f5f9', label: 'Borrador', icon: Clock },
  enviado: { color: '#f59e0b', bg: '#fef3c7', label: 'En Revisión', icon: AlertTriangle },
  aceptado: { color: '#10b981', bg: '#d1fae5', label: 'Aceptado', icon: CheckCircle },
  rechazado: { color: '#ef4444', bg: '#fee2e2', label: 'Rechazado', icon: XCircle },
  activo: { color: '#6366f1', bg: '#e0e7ff', label: 'Activo', icon: CheckCircle },
  finalizado: { color: '#64748b', bg: '#f1f5f9', label: 'Finalizado', icon: Clock },
  cancelado: { color: '#dc2626', bg: '#fee2e2', label: 'Cancelado', icon: XCircle },
  pendiente: { color: '#f59e0b', bg: '#fef3c7', label: 'Pendiente', icon: Clock },
};

const MisContratos = () => {
  const { isAuthenticated, user } = useAuth();
  const { showAlert, showConfirm, ModalComponent } = useAlertConfirm();
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContrato, setSelectedContrato] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchContratos = useCallback(async () => {
    try {
      const data = await contratoService.getAll();
      setContratos(data);
    } catch { setContratos([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isAuthenticated) fetchContratos(); }, [isAuthenticated, fetchContratos]);

  const verDetalle = (contrato) => { setSelectedContrato(contrato); setShowModal(true); };

  const esOwner = (c) => c.propietario_email === user?.email;

  if (!isAuthenticated) {
    return (<div className="propiedades-page"><div className="propiedades-empty">Inicia sesión para ver tus contratos</div></div>);
  }

  return (
    <div className="propiedades-page" style={{ paddingTop: '20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: 'clamp(12px, 4vw, 24px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', fontWeight: 700, margin: 0, color: '#1e293b' }}>Mis Contratos</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '0.9rem' }}>Contratos donde eres propietario o inquilino/comprador</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Cargando contratos...</div>
        ) : contratos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <FileText size={48} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
            <p style={{ fontSize: '1.1rem' }}>No tienes contratos aún</p>
            <p style={{ fontSize: '0.85rem' }}>Los contratos se crean desde el chat con el propietario o inquilino.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {contratos.map(c => {
              const cfg = estadoConfig[c.estado] || estadoConfig.pendiente;
              const IconComp = cfg.icon;
              return (
                <div key={c.id} style={{
                  background: '#fff', borderRadius: '16px', padding: '20px 24px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
                  cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onClick={() => verDetalle(c)}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <FileText size={18} color="#6366f1" />
                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1e293b' }}>Contrato #{c.id}</span>
                        <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <IconComp size={12} /> {cfg.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151' }}>{c.inmueble_titulo}</div>
                      <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                        {c.tipo_contrato_nombre || 'Sin tipo'} · {c.inmueble_direccion || ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '120px' }}>
                      <div style={{ fontWeight: 700, fontSize: 'clamp(1rem, 3vw, 1.2rem)', color: '#059669' }}>${c.monto} {c.moneda}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{c.inicio} → {c.fin || '∞'}</div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        {esOwner(c) ? (
                          <><Home size={14} /> Propietario</>
                        ) : (
                          <><User size={14} /> Inquilino/Comprador</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de detalle del contrato */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Detalle del Contrato">
        {selectedContrato && (
          <ContratoDetalle 
            contrato={selectedContrato} 
            user={user} 
            onUpdate={() => { fetchContratos(); setShowModal(false); }} 
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        )}
      </Modal>
      {ModalComponent}
    </div>
  );
};

const ContratoDetalle = ({ contrato: c, user, onUpdate, showAlert, showConfirm }) => {
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      const blob = await contratoService.downloadPdf(c.id);
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `Contrato_Oficial_${c.id}.pdf`);
      link.download = `Contrato_Oficial_${c.id}.pdf`;
      // Estilo fuera de pantalla para evitar flicker y asegurar compatibilidad Chrome
      link.style.position = 'absolute';
      link.style.left = '-9999px';
      link.style.top = '0';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        if (link.parentNode) document.body.removeChild(link);
      }, 2000);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showAlert({ title: 'Error de descarga', message: 'No se pudo descargar el contrato en formato PDF.', status: 'error' });
    }
  };

  const esCliente = c.inquilino === user?.id;
  const puedeAceptar = esCliente && c.estado === 'enviado';

  const handleAceptar = () => {
    showConfirm({
      title: '¿Aceptar y Firmar Contrato?',
      message: '¿Estás seguro de que deseas aceptar los términos y condiciones de este contrato? Al aceptar, se registrarán automáticamente tus firmas criptográficas digitales en la Blockchain.',
      status: 'question',
      confirmText: 'Sí, aceptar y firmar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await contratoService.aceptar(c.id);
          showAlert({
            title: '¡Contrato Firmado!',
            message: 'Has firmado y aceptado el contrato exitosamente. Sus bloques e historial digital se han sellado de forma inmutable en la Blockchain.',
            status: 'success'
          });
          onUpdate();
        } catch (e) {
          showAlert({
            title: 'Error al firmar',
            message: e.response?.data?.error || 'No se pudo firmar el contrato.',
            status: 'error'
          });
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleRechazar = () => {
    if (!motivoRechazo.trim()) {
      showAlert({
        title: 'Motivo Requerido',
        message: 'Por favor, ingresa un motivo para rechazar el borrador de contrato.',
        status: 'warning'
      });
      return;
    }
    showConfirm({
      title: '¿Rechazar Contrato?',
      message: '¿Estás seguro de que deseas rechazar este borrador? Se notificará al propietario con tus observaciones.',
      status: 'warning',
      confirmText: 'Sí, rechazar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await contratoService.rechazar(c.id, motivoRechazo);
          showAlert({
            title: 'Contrato Devuelto',
            message: 'Has rechazado el contrato. Se ha notificado al propietario con tus observaciones.',
            status: 'info'
          });
          onUpdate();
        } catch (e) {
          showAlert({
            title: 'Error al rechazar',
            message: e.response?.data?.error || 'No se pudo rechazar el contrato.',
            status: 'error'
          });
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const [isGeneratingIA, setIsGeneratingIA] = useState(false);

  // ── Chat con Asistente IA ──────────────────────────────
  const [chatMensajes, setChatMensajes] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatCargando, setChatCargando] = useState(false);
  const [chatIniciado, setChatIniciado] = useState(false);
  const [temasClickeados, setTemasClickeados] = useState([]);
  const chatEndRef = useRef(null);

  // Scroll al fondo del chat cuando llegan nuevos mensajes
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMensajes]);

  // Inicializar chat con saludo automático al abrir el modal
  useEffect(() => {
    if (!chatIniciado) {
      setChatIniciado(true);
      const saludo = `¡Hola! Soy tu asistente legal. Revisé el contrato de **${c.tipo_contrato_nombre || 'arrendamiento'}** entre **${c.propietario_nombre}** (propietario) y **${c.inquilino_nombre}** (inquilino) por el inmueble **${c.inmueble_titulo}** a $${c.monto} ${c.moneda}/mes.\n\n¿En qué puedo ayudarte? Puedo sugerirte cláusulas, restricciones, condiciones de uso, o analizar posibles riesgos para ambas partes.`;
      setChatMensajes([{ role: 'assistant', content: saludo }]);
    }
  }, [chatIniciado, c]);

  // Temas del contrato con sus chips — se van marcando conforme se hablan
  const TEMAS_CONTRATO = [
    { id: 'clausulas',    icon: List,          label: 'Cláusulas',       pregunta: '¿Qué cláusulas recomiendas para este contrato?' },
    { id: 'restricciones',icon: Ban,           label: 'Restricciones',   pregunta: '¿Qué restricciones debería incluir el contrato?' },
    { id: 'garantias',    icon: ShieldCheck,   label: 'Garantías',       pregunta: '¿Cómo debería estructurarse la garantía y el depósito?' },
    { id: 'penalizaciones',icon: AlertOctagon, label: 'Penalizaciones',  pregunta: '¿Qué penalizaciones recomiendas incluir si el inquilino incumple?' },
    { id: 'servicios',    icon: Wifi,          label: 'Servicios',       pregunta: '¿Qué servicios debería incluir o excluir el contrato?' },
    { id: 'cancelacion',  icon: Calendar,      label: 'Cancelación',    pregunta: '¿Cuál debería ser la política de cancelación del contrato?' },
    { id: 'renovacion',   icon: RefreshCw,     label: 'Renovación',     pregunta: '¿Qué tipo de cláusula de renovación recomiendas?' },
    { id: 'riesgos',      icon: Zap,           label: 'Riesgos Legales', pregunta: '¿Cuáles son los principales riesgos legales de este contrato?' },
    { id: 'uso',          icon: Building2,     label: 'Uso del Inmueble',pregunta: '¿Qué condiciones de uso debo especificar en el contrato?' },
    { id: 'antecedentes', icon: BookOpen,      label: 'Antecedentes',    pregunta: '¿Qué antecedentes del inmueble debo incluir en el contrato?' },
  ];

  // Retorna los temas que AUN NO se han discutido (se filtra por click del usuario)
  const getChipsPendientes = () => {
    return TEMAS_CONTRATO.filter(t => !temasClickeados.includes(t.id));
  };

  const enviarMensaje = async (textoOverride) => {
    const texto = (textoOverride || chatInput).trim();
    if (!texto || chatCargando) return;

    const nuevosMensajes = [...chatMensajes, { role: 'user', content: texto }];
    setChatMensajes(nuevosMensajes);
    setChatInput('');
    setChatCargando(true);

    try {
      const respuesta = await contratoService.chatIA(c.id, nuevosMensajes);
      setChatMensajes(prev => [...prev, { role: 'assistant', content: respuesta }]);
    } catch {
      setChatMensajes(prev => [...prev, {
        role: 'assistant',
        content: 'Error al contactar al asistente. Verifica tu conexión e inténtalo de nuevo.'
      }]);
    } finally {
      setChatCargando(false);
    }
  };

  // Extrae el texto del chat para enviarlo como instrucciones al PDF
  const getChatComoInstrucciones = () => {
    const conversacion = chatMensajes
      .filter((m, idx) => m.role !== 'assistant' || idx > 0) // Excluye el saludo inicial
      .map(m => `${m.role === 'user' ? 'Usuario' : 'Abogado IA'}: ${m.content}`)
      .join('\n\n');
    return conversacion.length > 100 ? conversacion : '';
  };

  const handleDownloadIA = async () => {
    setIsGeneratingIA(true);
    try {
      // Usar el chat como instrucciones para el PDF
      const instruccionesChat = getChatComoInstrucciones();
      const blob = await contratoService.generarContratoIA(c.id, instruccionesChat);
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const fileName = `Contrato_IA_${c.id}.pdf`;

      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      link.download = fileName;
      link.style.position = 'absolute';
      link.style.left = '-9999px';
      link.style.top = '0';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        if (link.parentNode) document.body.removeChild(link);
      }, 2000);
    } catch (error) {
      console.error('Error generando PDF con IA:', error);
      showAlert({
        title: 'Error de Asistente IA',
        message: 'Hubo un error al contactar a la Inteligencia Artificial para la redacción legal del contrato.',
        status: 'error'
      });
    } finally {
      setIsGeneratingIA(false);
    }
  };

  const cfg = estadoConfig[c.estado] || estadoConfig.pendiente;
  const sectionStyle = { marginBottom: '20px' };
  const titleStyle = { fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' };
  const rowStyle = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.9rem' };
  const labelStyle = { color: 'var(--color-text-secondary)', fontWeight: 500 };
  const valueStyle = { fontWeight: 600, color: 'var(--color-text)', textAlign: 'right', maxWidth: '60%' };

  return (
    <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '4px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px', padding: '16px', background: 'linear-gradient(135deg, var(--color-bg-secondary), rgba(14, 165, 233, 0.15))', borderRadius: '12px' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text)' }}>CONTRATO DE {(c.tipo_contrato_nombre || 'INMUEBLE').toUpperCase()}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Contrato N. {c.id} · Creado: {new Date(c.creado).toLocaleDateString('es-BO')}</div>
        <span style={{ display: 'inline-block', marginTop: '8px', background: cfg.bg, color: cfg.color, padding: '4px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>{cfg.label}</span>
      </div>

      {/* Partes */}
      <div style={sectionStyle}>
        <div style={titleStyle}>Partes del Contrato</div>
        <div className="contrato-partes-grid">
          <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '14px', padding: '16px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--color-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
              <Home size={14} /> Propietario
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>{c.propietario_nombre}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>CI: {c.propietario_ci || 'N/A'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Tel: {c.propietario_telefono || 'N/A'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 500 }}>{c.propietario_email}</div>
          </div>
          <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '14px', padding: '16px', border: '1px solid var(--color-border)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--color-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
              <User size={14} /> Inquilino / Comprador
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>{c.inquilino_nombre}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>CI: {c.inquilino_ci || 'N/A'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Tel: {c.inquilino_telefono || 'N/A'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 500 }}>{c.inquilino_email}</div>
          </div>
        </div>
      </div>

      {/* Inmueble */}
      <div style={sectionStyle}>
        <div style={titleStyle}>Inmueble</div>
        <div style={rowStyle}><span style={labelStyle}>Propiedad</span><span style={valueStyle}>{c.inmueble_titulo}</span></div>
        <div style={rowStyle}><span style={labelStyle}>Dirección</span><span style={valueStyle}>{c.inmueble_direccion || 'N/A'}</span></div>
      </div>

      {/* Condiciones Económicas */}
      <div style={sectionStyle}>
        <div style={titleStyle}>Condiciones Económicas</div>
        <div style={rowStyle}><span style={labelStyle}>Monto</span><span style={{ ...valueStyle, color: 'var(--color-success)', fontSize: '1.1rem' }}>${c.monto} {c.moneda}</span></div>
        <div style={rowStyle}><span style={labelStyle}>Depósito/Garantía</span><span style={valueStyle}>${c.deposito} {c.moneda}</span></div>
        <div style={rowStyle}><span style={labelStyle}>Día de pago</span><span style={valueStyle}>Día {c.dia_pago} de cada mes</span></div>
        <div style={rowStyle}><span style={labelStyle}>Forma de pago</span><span style={valueStyle}>{c.forma_pago || 'Stripe'}</span></div>
        <div style={rowStyle}><span style={labelStyle}>Vigencia</span><span style={valueStyle}>{c.inicio} → {c.fin || 'Indefinido'}</span></div>
      </div>

      {/* Cláusulas Legales */}
      {c.antecedentes && <div style={sectionStyle}><div style={titleStyle}>Antecedentes</div><div style={{ fontSize: '0.88rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', background: 'rgba(14, 165, 233, 0.12)', padding: '12px', borderRadius: '8px', lineHeight: '1.6', border: '1px solid rgba(14, 165, 233, 0.25)' }}>{c.antecedentes}</div></div>}
      {c.clausulas && <div style={sectionStyle}><div style={titleStyle}>Cláusulas</div><div style={{ fontSize: '0.88rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px', lineHeight: '1.6', border: '1px solid var(--color-border)' }}>{c.clausulas}</div></div>}
      {c.clausulas_especiales && <div style={sectionStyle}><div style={titleStyle}>Cláusulas Especiales</div><div style={{ fontSize: '0.88rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', background: 'rgba(139, 92, 246, 0.12)', padding: '12px', borderRadius: '8px', lineHeight: '1.6', border: '1px solid rgba(139, 92, 246, 0.25)' }}>{c.clausulas_especiales}</div></div>}
      {c.uso_exclusivo && <div style={sectionStyle}><div style={titleStyle}>Uso Exclusivo del Inmueble</div><div style={{ fontSize: '0.88rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', background: 'rgba(34, 197, 94, 0.12)', padding: '12px', borderRadius: '8px', lineHeight: '1.6', border: '1px solid rgba(34, 197, 94, 0.25)' }}>{c.uso_exclusivo}</div></div>}
      {c.condiciones_uso && <div style={sectionStyle}><div style={titleStyle}>Condiciones de Uso</div><div style={{ fontSize: '0.88rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px', lineHeight: '1.6', border: '1px solid var(--color-border)' }}>{c.condiciones_uso}</div></div>}
      {c.penalidades && <div style={sectionStyle}><div style={titleStyle}>Penalidades</div><div style={{ fontSize: '0.88rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', background: 'rgba(239, 68, 68, 0.12)', padding: '12px', borderRadius: '8px', lineHeight: '1.6', border: '1px solid rgba(239, 68, 68, 0.25)' }}>{c.penalidades}</div></div>}
      {c.politica_cancelacion && <div style={sectionStyle}><div style={titleStyle}>Política de Cancelación</div><div style={{ fontSize: '0.88rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px', lineHeight: '1.6', border: '1px solid var(--color-border)' }}>{c.politica_cancelacion}</div></div>}
      {c.incluye_servicios && <div style={sectionStyle}><div style={titleStyle}>Servicios Incluidos</div><div style={{ fontSize: '0.88rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', background: 'rgba(34, 197, 94, 0.12)', padding: '12px', borderRadius: '8px', lineHeight: '1.6', border: '1px solid rgba(34, 197, 94, 0.25)' }}>{c.incluye_servicios}</div></div>}
      {c.restricciones && <div style={sectionStyle}><div style={titleStyle}>Restricciones</div><div style={{ fontSize: '0.88rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', background: 'rgba(245, 158, 11, 0.12)', padding: '12px', borderRadius: '8px', lineHeight: '1.6', border: '1px solid rgba(245, 158, 11, 0.25)' }}>{c.restricciones}</div></div>}
      {c.observaciones && <div style={sectionStyle}><div style={titleStyle}>Observaciones</div><div style={{ fontSize: '0.88rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', background: 'var(--color-bg-secondary)', padding: '12px', borderRadius: '8px', lineHeight: '1.6', border: '1px solid var(--color-border)' }}>{c.observaciones}</div></div>}
      {c.motivo_rechazo && <div style={sectionStyle}><div style={titleStyle}>Motivo de Rechazo</div><div style={{ fontSize: '0.88rem', color: 'var(--color-danger)', whiteSpace: 'pre-wrap', background: 'rgba(239, 68, 68, 0.12)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>{c.motivo_rechazo}</div></div>}

      {/* Trazabilidad inmutable en Blockchain */}
      <div style={{ marginTop: '24px', borderTop: '2px solid var(--color-border)', paddingTop: '20px', marginBottom: '20px' }}>
        <BlockchainAuditTrail assetId={`CON-${c.id}`} />
      </div>

      {/* Acciones del cliente */}
      {puedeAceptar && (
        <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: '16px', marginTop: '16px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <button onClick={handleAceptar} disabled={actionLoading} style={{
              flex: 1, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
              border: 'none', borderRadius: '10px', padding: '12px', fontWeight: 700, fontSize: '0.95rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              <CheckCircle size={18} /> Aceptar Contrato
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input type="text" value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} placeholder="Motivo de rechazo (obligatorio para rechazar)..."
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)', color: 'var(--color-text)', borderRadius: '8px', padding: '10px', fontSize: '0.9rem', width: '100%' }} />
            <button onClick={handleRechazar} disabled={actionLoading} style={{
              background: 'rgba(239, 68, 68, 0.12)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px',
              padding: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              <XCircle size={16} /> Rechazar Contrato
            </button>
          </div>
        </div>
      )}
      
      {/* ── ASISTENTE IA CHAT ─────────────────────────────── */}
      <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
        {/* Header del chat */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>Asistente Legal IA</div>
              <div style={{ fontSize: '0.72rem', color: '#8b5cf6' }}>Abogado Inmobiliario Boliviano · Powered by Llama 3.3</div>
            </div>
          </div>
          <button
            onClick={() => { setChatMensajes([]); setChatIniciado(false); setTemasClickeados([]); }}
            title="Reiniciar conversación"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Área de mensajes */}
        <div style={{
          height: '300px', overflowY: 'auto', border: '1px solid var(--color-border)',
          borderRadius: '12px', padding: '12px', background: 'var(--color-bg)',
          display: 'flex', flexDirection: 'column', gap: '12px',
          scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent',
        }}>
          {chatMensajes.map((msg, idx) => (
            <div key={idx} style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-start', gap: '8px',
            }}>
              {/* Avatar */}
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                  : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 800, color: '#fff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }}>
                {msg.role === 'user' ? 'Tú' : <Bot size={13} />}
              </div>
              {/* Burbuja */}
              <div style={{
                maxWidth: '78%',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                  : 'var(--color-bg-card)',
                color: msg.role === 'user' ? '#fff' : 'var(--color-text)',
                borderRadius: msg.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                padding: '10px 14px',
                fontSize: '0.84rem',
                lineHeight: '1.6',
                boxShadow: msg.role === 'user'
                  ? '0 3px 12px rgba(99,102,241,0.35)'
                  : '0 2px 8px rgba(0,0,0,0.15)',
                border: msg.role === 'assistant' ? '1px solid var(--color-border)' : 'none',
                borderLeft: msg.role === 'assistant' ? '3px solid #8b5cf6' : 'none',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content.replace(/\*\*(.*?)\*\*/g, '$1')}
              </div>
            </div>
          ))}
          {chatCargando && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              }}>
                <Bot size={13} color="#fff" />
              </div>
              <div style={{
                background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderLeft: '3px solid #8b5cf6',
                borderRadius: '4px 18px 18px 18px',
                padding: '12px 18px', display: 'flex', gap: '5px', alignItems: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chips dinámicos: todos visibles en cuadrícula de 2 filas */}
        {!chatCargando && (() => {
          const pendientes = getChipsPendientes();
          if (pendientes.length === 0) return null;
          const esInicio = chatMensajes.length <= 1;
          return (
            <div style={{ marginTop: '8px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '6px',
              }}>
                <span style={{ fontSize: '0.71rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.3px' }}>
                  {esInicio ? '¿Por dónde quieres empezar?' : 'También puedo ayudarte con:'}
                </span>
                <span style={{
                  fontSize: '0.68rem', background: '#ede9fe', color: '#7c3aed',
                  borderRadius: '10px', padding: '2px 8px', fontWeight: 700,
                }}>
                  {pendientes.length} temas
                </span>
              </div>
              {/* Grid visible — todos los chips en 2 filas max */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '6px',
              }}>
                {pendientes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTemasClickeados(prev => [...prev, t.id]);
                      enviarMensaje(t.pregunta);
                    }}
                    style={{
                      background: '#f5f3ff', color: '#6d28d9',
                      border: '1.5px solid #ddd6fe',
                      borderRadius: '20px', padding: '5px 12px',
                      fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: '5px',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.borderColor = '#8b5cf6';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(139,92,246,0.3)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = '#f5f3ff';
                      e.currentTarget.style.color = '#6d28d9';
                      e.currentTarget.style.borderColor = '#ddd6fe';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {(() => { const IconComp = t.icon; return <IconComp size={13} />; })()}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Input del chat */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensaje()}
            placeholder="Escribe tu consulta al asistente legal..."
            disabled={chatCargando}
            style={{
              flex: 1, border: '1.5px solid var(--color-border)', borderRadius: '12px',
              padding: '10px 16px', fontSize: '0.88rem', fontFamily: 'inherit',
              background: 'var(--color-bg-card)', color: 'var(--color-text)', outline: 'none',
              opacity: chatCargando ? 0.6 : 1,
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = '#8b5cf6'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.12)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
          />
          <button
            onClick={() => enviarMensaje()}
            disabled={!chatInput.trim() || chatCargando}
            style={{
              width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
              background: !chatInput.trim() || chatCargando
                ? '#e2e8f0'
                : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              border: 'none', cursor: !chatInput.trim() || chatCargando ? 'default' : 'pointer',
              color: !chatInput.trim() || chatCargando ? '#94a3b8' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
              boxShadow: !chatInput.trim() || chatCargando ? 'none' : '0 4px 12px rgba(139,92,246,0.35)',
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Botones de descarga de PDF */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
        <button onClick={handleDownloadIA} disabled={isGeneratingIA} style={{
          width: '100%', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff',
          border: 'none', borderRadius: '10px', padding: '12px', fontWeight: 700, fontSize: '0.95rem',
          cursor: isGeneratingIA ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          opacity: isGeneratingIA ? 0.7 : 1
        }}>
          {isGeneratingIA ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              Redactando contrato con IA...
            </span>
          ) : (
            <><Sparkles size={18} /> Generar Contrato con IA</>
          )}
        </button>

        <button onClick={handleDownloadPDF} style={{
          width: '100%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff',
          border: 'none', borderRadius: '10px', padding: '12px', fontWeight: 700, fontSize: '0.95rem',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <FileText size={18} /> Descargar Contrato Básico PDF
        </button>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .chips-scroll::-webkit-scrollbar { display: none; }
        .contrato-partes-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 600px) {
          .contrato-partes-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default MisContratos;
