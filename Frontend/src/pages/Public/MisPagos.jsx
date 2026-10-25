import { useState, useEffect } from 'react';
import api from '../../services/api';
import BlockchainAuditTrail from '../../components/BlockchainAuditTrail';
import CollapsibleDetails from '../../components/CollapsibleDetails';
import { 
  CreditCard, 
  Search, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Download,
  Building2,
  Receipt,
  X
} from 'lucide-react';
import './MisPagos.css';

const MisPagos = () => {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null);

  useEffect(() => {
    fetchPagos();
  }, []);

  const fetchPagos = async () => {
    try {
      const res = await api.get('/pagos/lista/?personal=true');
      setPagos(res.data.results || res.data);
    } catch (err) {
      console.error("Error fetching pagos:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPagos = pagos.filter(p => 
    p.inmueble_titulo?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.referencia?.toLowerCase().includes(filtro.toLowerCase())
  );

  const getStatusStyle = (estado) => {
    switch (estado) {
      case 'completado': return { bg: 'rgba(16, 185, 129, 0.10)', color: '#4ade80', icon: <CheckCircle2 size={14} /> };
      case 'pendiente': return { bg: 'rgba(251, 191, 36, 0.10)', color: '#d97706', icon: <Clock size={14} /> };
      case 'fallido': return { bg: 'rgba(244, 63, 94, 0.10)', color: '#f87171', icon: <ArrowRight size={14} /> };
      default: return { bg: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', icon: <FileText size={14} /> };
    }
  };

  return (
    <div style={{ paddingTop: '20px' }}>
      
      <div className="mispagos-container">
        <header className="mispagos-header">
          <div>
            <h1 className="mispagos-title">
              Mis Pagos
            </h1>
            <p className="mispagos-subtitle">Historial detallado de tus transacciones inmobiliarias</p>
          </div>

          <div className="mispagos-search-container">
            <Search className="mispagos-search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por propiedad o referencia..." 
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="mispagos-search-input"
            />
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <Clock className="spin" size={48} color="#cbd5e1" />
            <p style={{ color: '#94a3b8', marginTop: '16px' }}>Cargando historial de pagos...</p>
          </div>
        ) : filteredPagos.length === 0 ? (
          <div style={{ background: 'var(--color-surface)', borderRadius: '24px', padding: '80px 40px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
            <div style={{ width: '80px', height: '80px', background: 'var(--color-bg-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CreditCard size={40} color="#94a3b8" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>Aún no tienes pagos</h3>
            <p style={{ color: 'var(--color-text-secondary)', maxWidth: '300px', margin: '8px auto 0' }}>
              Tus transacciones aparecerán aquí una vez que se procesen.
            </p>
          </div>
        ) : (
          <div className="mispagos-list">
            {filteredPagos.map((pago) => {
              const status = getStatusStyle(pago.estado);
              return (
                <div key={pago.id} className="mispagos-card">
                  <div className="mispagos-card-icon">
                    <Building2 size={26} color="#64748b" />
                  </div>

                  <div className="mispagos-card-info">
                    <h4>{pago.inmueble_titulo || 'Propiedad'}</h4>
                    <div className="mispagos-card-details">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={14} /> {new Date(pago.fecha).toLocaleDateString()}
                      </span>
                      <span style={{ color: '#cbd5e1' }}>|</span>
                      <span>Ref: {pago.referencia?.split(':')[0] || 'Manual'}</span>
                    </div>
                  </div>

                  <div className="mispagos-card-amount">
                    <div className="mispagos-amount-val">
                      Bs {parseFloat(pago.monto).toLocaleString('es-BO')}
                    </div>
                    <div 
                      className="mispagos-status-badge"
                      style={{ background: status.bg, color: status.color }}
                    >
                      {status.icon} {pago.estado}
                    </div>
                  </div>

                  <div>
                    <button 
                      onClick={() => setPagoSeleccionado(pago)}
                      className="mispagos-btn-comprobante"
                    >
                      <Receipt size={18} /> Comprobante
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Modal de Comprobante Expandido ─────────────────────── */}
      {pagoSeleccionado && (
        <div className="mispagos-modal-overlay">
          <div className="mispagos-modal-box">
            <div className="mispagos-modal-header">
              <button
                onClick={() => setPagoSeleccionado(null)}
                className="mispagos-modal-close"
                aria-label="Cerrar recibo"
              >
                <X size={18} />
              </button>
              <div className="mispagos-modal-icon-wrapper">
                <CheckCircle2 size={42} color="#16a34a" />
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text)', margin: 0 }}>Tu recibo de pago</h2>
              <p style={{ color: 'var(--color-text-secondary)', margin: '8px 0 0', fontWeight: 500, fontSize: '1.1rem' }}>Autogestión Inmobiliaria - Bolivia</p>
            </div>

            <div className="mispagos-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                <div className="mispagos-modal-grid-2 mispagos-modal-border-bottom">
                  <div>
                    <label className="mispagos-modal-label">Fecha de Emisión</label>
                    <span className="mispagos-modal-val">{new Date(pagoSeleccionado.creado).toLocaleString('es-BO')}</span>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <label className="mispagos-modal-label">ID de Transacción</label>
                    <span className="mispagos-modal-txhash">
                      {pagoSeleccionado.referencia?.toUpperCase() || 'MANUAL-REC'}
                    </span>
                  </div>
                </div>

                <div className="mispagos-modal-grid-2">
                  <div className="mispagos-modal-parties">
                    <label className="mispagos-modal-label" style={{ marginBottom: '12px' }}>Información de Partes</label>
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>Propietario:</div>
                      <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{pagoSeleccionado.usuario_nombre}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>Cliente:</div>
                      <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>Usuario Registrado</div>
                    </div>
                  </div>

                  <div className="mispagos-modal-concept">
                    <label className="mispagos-modal-label">Propiedad y Concepto</label>
                    <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '1.2rem', lineHeight: '1.2' }}>{pagoSeleccionado.inmueble_titulo}</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>Pago de canon/venta según Contrato #{pagoSeleccionado.contrato}</div>
                  </div>
                </div>
                
                <div className="mispagos-modal-amount-banner">
                  <div>
                    <span className="mispagos-amount-banner-lbl">Monto Total Liquidado</span>
                    <span style={{ color: '#0ea5e9', fontSize: '0.85rem', fontWeight: 700 }}>Moneda oficial: Bolivianos (BOB)</span>
                  </div>
                  <span className="mispagos-amount-banner-val">
                    Bs {parseFloat(pagoSeleccionado.monto).toLocaleString('es-BO')}
                  </span>
                </div>
              </div>

              {/* Registro de seguridad del pago */}
              <CollapsibleDetails label="Ver registro de seguridad">
                <BlockchainAuditTrail assetId={`PAG-${pagoSeleccionado.id}`} />
              </CollapsibleDetails>

              <div className="mispagos-modal-actions">
                <button 
                  onClick={() => window.print()}
                  className="mispagos-modal-btn-secondary"
                >
                  <Download size={22} /> Descargar en PDF
                </button>
                <button 
                  onClick={() => setPagoSeleccionado(null)}
                  className="mispagos-modal-btn-primary"
                >
                  Entendido
                </button>
              </div>
              
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', marginTop: '32px', lineHeight: '1.5' }}>
                Este documento es un comprobante digital de pago generado automáticamente.<br/>
                Para consultas legales, por favor refiera el ID de Transacción mencionado arriba.
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin { animation: spin 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default MisPagos;
