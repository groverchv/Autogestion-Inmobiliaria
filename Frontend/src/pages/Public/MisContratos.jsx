import { useState, useEffect, useCallback } from 'react';
import { FileText, Eye, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, AlertTriangle, Home, User } from 'lucide-react';
import Navbar from '../../components/Navbar';
import UserMenu from '../../components/UserMenu';
import Modal from '../../components/Modal';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
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
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContrato, setSelectedContrato] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchContratos = useCallback(async () => {
    try {
      const res = await api.get('/inmuebles/contratos/');
      setContratos(res.data.results || res.data);
    } catch { setContratos([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isAuthenticated) fetchContratos(); }, [isAuthenticated, fetchContratos]);

  const verDetalle = (contrato) => { setSelectedContrato(contrato); setShowModal(true); };

  const esOwner = (c) => c.propietario_email === user?.email;

  if (!isAuthenticated) {
    return (<div className="propiedades-page"><Navbar /><div className="propiedades-empty">Inicia sesión para ver tus contratos</div></div>);
  }

  return (
    <div className="propiedades-page">
      <Navbar />
      <UserMenu />
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>Mis Contratos</h1>
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
                    <div style={{ textAlign: 'right', minWidth: '140px' }}>
                      <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#059669' }}>${c.monto} {c.moneda}</div>
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
        {selectedContrato && <ContratoDetalle contrato={selectedContrato} user={user} onUpdate={() => { fetchContratos(); setShowModal(false); }} />}
      </Modal>
    </div>
  );
};

const ContratoDetalle = ({ contrato: c, user, onUpdate }) => {
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const esCliente = c.inquilino === user?.id;
  const puedeAceptar = esCliente && c.estado === 'enviado';
  const puedeRechazar = esCliente && c.estado === 'enviado';

  const handleAceptar = async () => {
    setActionLoading(true);
    try {
      await api.post(`/inmuebles/contratos/${c.id}/aceptar/`);
      onUpdate();
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
    finally { setActionLoading(false); }
  };

  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) { alert('Ingresa un motivo de rechazo'); return; }
    setActionLoading(true);
    try {
      await api.post(`/inmuebles/contratos/${c.id}/rechazar/`, { motivo: motivoRechazo });
      onUpdate();
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
    finally { setActionLoading(false); }
  };

  const cfg = estadoConfig[c.estado] || estadoConfig.pendiente;
  const sectionStyle = { marginBottom: '20px' };
  const titleStyle = { fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' };
  const rowStyle = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' };
  const labelStyle = { color: '#64748b', fontWeight: 500 };
  const valueStyle = { fontWeight: 600, color: '#1e293b', textAlign: 'right', maxWidth: '60%' };

  return (
    <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '4px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px', padding: '16px', background: 'linear-gradient(135deg, #f8fafc, #e0e7ff)', borderRadius: '12px' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>CONTRATO DE {(c.tipo_contrato_nombre || 'INMUEBLE').toUpperCase()}</div>
        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Contrato N. {c.id} · Creado: {new Date(c.creado).toLocaleDateString('es-BO')}</div>
        <span style={{ display: 'inline-block', marginTop: '8px', background: cfg.bg, color: cfg.color, padding: '4px 14px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>{cfg.label}</span>
      </div>

      {/* Partes */}
      <div style={sectionStyle}>
        <div style={titleStyle}>Partes del Contrato</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#6366f1', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
              <Home size={14} /> Propietario
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{c.propietario_nombre}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>CI: {c.propietario_ci || 'N/A'}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Tel: {c.propietario_telefono || 'N/A'}</div>
            <div style={{ fontSize: '0.85rem', color: '#0ea5e9', fontWeight: 500 }}>{c.propietario_email}</div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#6366f1', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
              <User size={14} /> Inquilino / Comprador
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{c.inquilino_nombre}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>CI: {c.inquilino_ci || 'N/A'}</div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Tel: {c.inquilino_telefono || 'N/A'}</div>
            <div style={{ fontSize: '0.85rem', color: '#0ea5e9', fontWeight: 500 }}>{c.inquilino_email}</div>
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
        <div style={rowStyle}><span style={labelStyle}>Monto</span><span style={{ ...valueStyle, color: '#059669', fontSize: '1.1rem' }}>${c.monto} {c.moneda}</span></div>
        <div style={rowStyle}><span style={labelStyle}>Depósito/Garantía</span><span style={valueStyle}>${c.deposito} {c.moneda}</span></div>
        <div style={rowStyle}><span style={labelStyle}>Día de pago</span><span style={valueStyle}>Día {c.dia_pago} de cada mes</span></div>
        <div style={rowStyle}><span style={labelStyle}>Forma de pago</span><span style={valueStyle}>{c.forma_pago || 'Stripe'}</span></div>
        <div style={rowStyle}><span style={labelStyle}>Vigencia</span><span style={valueStyle}>{c.inicio} → {c.fin || 'Indefinido'}</span></div>
      </div>

      {/* Cláusulas Legales */}
      {c.clausulas && <div style={sectionStyle}><div style={titleStyle}>Cláusulas</div><div style={{ fontSize: '0.88rem', color: '#374151', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '12px', borderRadius: '8px', lineHeight: '1.6' }}>{c.clausulas}</div></div>}
      {c.condiciones_uso && <div style={sectionStyle}><div style={titleStyle}>Condiciones de Uso</div><div style={{ fontSize: '0.88rem', color: '#374151', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '12px', borderRadius: '8px', lineHeight: '1.6' }}>{c.condiciones_uso}</div></div>}
      {c.penalidades && <div style={sectionStyle}><div style={titleStyle}>Penalidades</div><div style={{ fontSize: '0.88rem', color: '#374151', whiteSpace: 'pre-wrap', background: '#fef2f2', padding: '12px', borderRadius: '8px', lineHeight: '1.6' }}>{c.penalidades}</div></div>}
      {c.politica_cancelacion && <div style={sectionStyle}><div style={titleStyle}>Política de Cancelación</div><div style={{ fontSize: '0.88rem', color: '#374151', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '12px', borderRadius: '8px', lineHeight: '1.6' }}>{c.politica_cancelacion}</div></div>}
      {c.incluye_servicios && <div style={sectionStyle}><div style={titleStyle}>Servicios Incluidos</div><div style={{ fontSize: '0.88rem', color: '#374151', whiteSpace: 'pre-wrap', background: '#f0fdf4', padding: '12px', borderRadius: '8px', lineHeight: '1.6' }}>{c.incluye_servicios}</div></div>}
      {c.restricciones && <div style={sectionStyle}><div style={titleStyle}>Restricciones</div><div style={{ fontSize: '0.88rem', color: '#374151', whiteSpace: 'pre-wrap', background: '#fef3c7', padding: '12px', borderRadius: '8px', lineHeight: '1.6' }}>{c.restricciones}</div></div>}
      {c.observaciones && <div style={sectionStyle}><div style={titleStyle}>Observaciones</div><div style={{ fontSize: '0.88rem', color: '#374151', whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '12px', borderRadius: '8px', lineHeight: '1.6' }}>{c.observaciones}</div></div>}
      {c.motivo_rechazo && <div style={sectionStyle}><div style={titleStyle}>Motivo de Rechazo</div><div style={{ fontSize: '0.88rem', color: '#dc2626', whiteSpace: 'pre-wrap', background: '#fee2e2', padding: '12px', borderRadius: '8px' }}>{c.motivo_rechazo}</div></div>}

      {/* Acciones del cliente */}
      {puedeAceptar && (
        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
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
              style={{ border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px', fontSize: '0.9rem', width: '100%' }} />
            <button onClick={handleRechazar} disabled={actionLoading} style={{
              background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '10px',
              padding: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              <XCircle size={16} /> Rechazar Contrato
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MisContratos;
