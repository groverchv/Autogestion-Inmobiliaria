import { useState, useEffect } from 'react';
import api from '../../services/api';
import Navbar from '../../components/Navbar';
import UserMenu from '../../components/UserMenu';
import BlockchainAuditTrail from '../../components/BlockchainAuditTrail';
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
  Receipt
} from 'lucide-react';

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
      case 'completado': return { bg: '#f0fdf4', color: '#16a34a', icon: <CheckCircle2 size={14} /> };
      case 'pendiente': return { bg: '#fffbeb', color: '#d97706', icon: <Clock size={14} /> };
      case 'fallido': return { bg: '#fef2f2', color: '#dc2626', icon: <ArrowRight size={14} /> };
      default: return { bg: '#f8fafc', color: '#64748b', icon: <FileText size={14} /> };
    }
  };

  return (
    <div style={{ paddingTop: '20px' }}>
      
      <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
        <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
              Mis Pagos
            </h1>
            <p style={{ color: '#64748b', marginTop: '4px' }}>Historial detallado de tus transacciones inmobiliarias</p>
          </div>

          <div style={{ position: 'relative', width: '340px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
            <input 
              type="text" 
              placeholder="Buscar por propiedad o referencia..." 
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              style={{
                width: '100%', padding: '12px 12px 12px 42px', borderRadius: '14px',
                border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.95rem',
                outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s'
              }}
            />
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <Clock className="spin" size={48} color="#cbd5e1" />
            <p style={{ color: '#94a3b8', marginTop: '16px' }}>Cargando historial de pagos...</p>
          </div>
        ) : filteredPagos.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '24px', padding: '80px 40px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CreditCard size={40} color="#94a3b8" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#334155' }}>No hay registros de pagos</h3>
            <p style={{ color: '#64748b', maxWidth: '300px', margin: '8px auto 0' }}>
              Tus transacciones aparecerán aquí una vez que se procesen.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredPagos.map((pago) => {
              const status = getStatusStyle(pago.estado);
              return (
                <div 
                  key={pago.id}
                  style={{
                    background: '#fff', borderRadius: '20px', padding: '24px',
                    border: '1px solid #e2e8f0', display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto auto', alignItems: 'center', gap: '28px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ 
                    width: '56px', height: '56px', borderRadius: '16px', 
                    background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}>
                    <Building2 size={26} color="#64748b" />
                  </div>

                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                      {pago.inmueble_titulo || 'Propiedad'}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '0.88rem', color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={14} /> {new Date(pago.fecha).toLocaleDateString()}
                      </span>
                      <span style={{ color: '#cbd5e1' }}>|</span>
                      <span>Ref: {pago.referencia?.split(':')[0] || 'Manual'}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', minWidth: '160px' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                      Bs {parseFloat(pago.monto).toLocaleString('es-BO')}
                    </div>
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      padding: '5px 12px', borderRadius: '99px', fontSize: '0.78rem',
                      fontWeight: 700, textTransform: 'uppercase',
                      background: status.bg, color: status.color, marginTop: '8px'
                    }}>
                      {status.icon} {pago.estado}
                    </div>
                  </div>

                  <div>
                    <button 
                      onClick={() => setPagoSeleccionado(pago)}
                      style={{
                        padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0',
                        background: '#fff', color: '#1e293b', fontWeight: 700, fontSize: '0.9rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                        transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = '#fff';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
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
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: '#fff', width: '95%', maxWidth: '720px', borderRadius: '32px',
            overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
            animation: 'modalSlideUp 0.4s ease-out',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ 
              padding: '48px 48px 32px', textAlign: 'center', 
              background: 'linear-gradient(to bottom, #f8fafc, #fff)',
              borderBottom: '1px dashed #cbd5e1', position: 'relative' 
            }}>
              <button 
                onClick={() => setPagoSeleccionado(null)}
                style={{ 
                  position: 'absolute', right: '32px', top: '32px', background: '#f1f5f9', 
                  border: 'none', cursor: 'pointer', color: '#64748b', width: '40px', height: '40px',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
              >
                ✕
              </button>
              <div style={{ 
                width: '80px', height: '80px', background: '#f0fdf4', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                boxShadow: '0 0 0 10px #f8fafc'
              }}>
                <CheckCircle2 size={42} color="#16a34a" />
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Comprobante de Pago</h2>
              <p style={{ color: '#64748b', margin: '8px 0 0', fontWeight: 500, fontSize: '1.1rem' }}>Autogestión Inmobiliaria - Bolivia</p>
            </div>

            <div style={{ padding: '40px 48px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Fecha de Emisión</label>
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>{new Date(pagoSeleccionado.creado).toLocaleString('es-BO')}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>ID de Transacción</label>
                    <span style={{ 
                      fontSize: '0.9rem', fontWeight: 700, color: '#0ea5e9', 
                      wordBreak: 'break-all', display: 'block', maxWidth: '280px', marginLeft: 'auto' 
                    }}>
                      {pagoSeleccionado.referencia?.toUpperCase() || 'MANUAL-REC'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                  <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px' }}>Información de Partes</label>
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Propietario:</div>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{pagoSeleccionado.usuario_nombre}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Cliente:</div>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>Usuario Registrado</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>Propiedad y Concepto</label>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.2rem', lineHeight: '1.2' }}>{pagoSeleccionado.inmueble_titulo}</div>
                    <div style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>Pago de canon/venta según Contrato #{pagoSeleccionado.contrato}</div>
                  </div>
                </div>
                
                <div style={{ 
                  marginTop: '10px', padding: '32px', background: '#1e293b', borderRadius: '24px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
                }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#94a3b8', fontSize: '1rem', display: 'block' }}>Monto Total Liquidado</span>
                    <span style={{ color: '#0ea5e9', fontSize: '0.85rem', fontWeight: 700 }}>Moneda oficial: Bolivianos (BOB)</span>
                  </div>
                  <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff' }}>
                    Bs {parseFloat(pagoSeleccionado.monto).toLocaleString('es-BO')}
                  </span>
                </div>
              </div>

              {/* Trazabilidad inmutable en Blockchain */}
              <div style={{ marginTop: '24px', borderTop: '1px dashed #cbd5e1', paddingTop: '20px', marginBottom: '10px' }}>
                <BlockchainAuditTrail assetId={`PAG-${pagoSeleccionado.id}`} />
              </div>

              <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <button 
                  onClick={() => window.print()}
                  style={{
                    padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0',
                    background: '#fff', color: '#1e293b', fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                    fontSize: '1rem', transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={e => e.currentTarget.style.background = '#fff'}
                >
                  <Download size={22} /> Descargar en PDF
                </button>
                <button 
                  onClick={() => setPagoSeleccionado(null)}
                  style={{
                    padding: '16px', borderRadius: '16px', border: 'none',
                    background: '#0ea5e9', color: '#fff', fontWeight: 800, cursor: 'pointer',
                    fontSize: '1rem', boxShadow: '0 4px 12px rgba(14,165,233,0.4)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
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
