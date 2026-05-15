import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { TrendingUp, Settings, DollarSign, FileText, FileSpreadsheet, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import reportesService from '../../services/reportesService';
import configuracionService from '../../services/configuracionService';
import FiltroReportes from '../../components/FiltroReportes';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import './Finanzas.css';

const FinanzasAdmin = () => {
  const [reportData, setReportData] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [filtros, setFiltros] = useState({ rango: 'ultimos_12_meses' });
  const [nuevaComision, setNuevaComision] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' }); // tipo: 'success' | 'error'

  useEffect(() => {
    fetchData();
  }, [filtros]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resReportes, resConfig] = await Promise.all([
        reportesService.obtenerReportes(filtros),
        configuracionService.obtenerConfiguracion()
      ]);
      setReportData(resReportes);
      setConfig(resConfig);
      setNuevaComision(resConfig?.porcentaje_comision_plataforma || '');
    } catch (error) {
      console.error("Error fetching admin finances:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    if (!config?.id) return;
    setSavingConfig(true);
    setMensaje({ texto: '', tipo: '' });
    try {
      const updated = await configuracionService.actualizarConfiguracion(config.id, {
        porcentaje_comision_plataforma: parseFloat(nuevaComision)
      });
      setConfig(updated);
      setMensaje({ texto: 'Comisión actualizada correctamente', tipo: 'success' });
      
      // Limpiar mensaje después de 4 segundos
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000);
    } catch (error) {
      console.error("Error updating config:", error);
      setMensaje({ texto: 'Error al actualizar la configuración', tipo: 'error' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDownloadExcel = () => {
    setExportingExcel(true);
    try {
      const rows = (reportData?.grafico_evolucion || []).map(item => ({
        "Periodo": item.fecha,
        "Ingreso Comisiones (Bs)": item.ingreso,
      }));

      rows.push({
        "Periodo": "TOTAL ACUMULADO",
        "Ingreso Comisiones (Bs)": reportData?.kpis?.total_ingreso_comisiones || 0,
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Finanzas Globales");

      const wscols = [{wch: 20}, {wch: 25}];
      worksheet['!cols'] = wscols;

      XLSX.writeFile(workbook, `reporte_admin_finanzas_${filtros.rango}.xlsx`);
    } catch (error) {
      console.error("Error exporting admin Excel:", error);
    } finally {
      setExportingExcel(false);
    }
  };

  const handleDownloadPDF = () => {
    const element = document.querySelector('.print-container');
    if (!element) return;
    
    const opt = {
      margin:       [3, 3],
      filename:     `reporte_admin_financiero_${filtros.rango}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 1.8, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    setExporting(true);
    element.classList.add('is-exporting');

    html2pdf().set(opt).from(element).save().then(() => {
      element.classList.remove('is-exporting');
      setExporting(false);
    });
  };

  if (loading) return <div className="loading-container">Cargando reporte financiero...</div>;

  const formatterMonto = (value) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(value);

  return (
    <div className="print-container" style={{ padding: '0px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
            Análisis Financiero Global
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Monitoreo de ingresos por comisiones y configuración de parámetros transaccionales.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            className="no-print"
            onClick={handleDownloadPDF}
            disabled={exporting}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0',
              background: '#fff', color: '#1e1b4b', fontWeight: 600, cursor: exporting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s'
            }}
          >
            {exporting ? <Clock className="spin" size={16} /> : <FileText size={16} />}
            {exporting ? 'Generando...' : 'Exportar Informe PDF'}
          </button>

          <button
            className="no-print"
            onClick={handleDownloadExcel}
            disabled={exportingExcel}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0',
              background: '#fff', color: '#1e1b4b', fontWeight: 600, cursor: exportingExcel ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s'
            }}
          >
            {exportingExcel ? <Clock className="spin" size={16} /> : <FileSpreadsheet size={16} />}
            {exportingExcel ? 'Generando...' : 'Data Excel'}
          </button>
        </div>
      </div>
      
      <FiltroReportes onFilterChange={setFiltros} showInmuebleFilter={false} />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <DollarSign size={24} />
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginBottom: '4px' }}>Ingresos por Comisiones</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a' }}>
            {formatterMonto(reportData?.kpis?.total_ingreso_comisiones || 0)}
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e0f2fe', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <TrendingUp size={24} />
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginBottom: '4px' }}>Pagos Procesados</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0ea5e9' }}>
            {reportData?.kpis?.total_pagos_exitosos || 0}
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <FileText size={24} />
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500, marginBottom: '4px' }}>Contratos Activos</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>
            {reportData?.kpis?.contratos_activos || 0}
          </p>
        </div>
      </div>

      {/* Main Chart */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <TrendingUp size={20} color="#0ea5e9" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            Evolución de Ingresos (Comisiones)
          </h2>
        </div>

        <div style={{ height: 400, width: '100%' }}>
          {reportData?.grafico_evolucion?.length > 0 ? (
            <ResponsiveContainer>
              <BarChart data={reportData?.grafico_evolucion}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="fecha" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tickFormatter={(value) => `${value}`} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value) => [formatterMonto(value), 'Comisión']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="ingreso" radius={[4, 4, 0, 0]} barSize={40} fill="#0ea5e9">
                  {(reportData?.grafico_evolucion || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0ea5e9' : '#0284c7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>
              No hay datos suficientes para mostrar en este periodo.
            </div>
          )}
        </div>
      </div>

      {/* Config Section */}
      <div className="config-section no-print" style={{ 
        background: '#fff', 
        borderRadius: '16px', 
        border: '1px solid #e2e8f0', 
        padding: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px'
      }}>
        <div style={{ flex: '1', minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Settings size={20} color="#0ea5e9" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Gestión de Comisiones</h3>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
            Ajusta el porcentaje global que la plataforma retiene por cada transacción.
          </p>
        </div>

        <div style={{ 
          background: '#f8fafc', 
          padding: '16px 24px', 
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
              Valor Actual
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input 
                type="number" 
                step="0.1"
                className="config-input" 
                value={nuevaComision}
                onChange={(e) => setNuevaComision(e.target.value)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  borderBottom: '2px solid #0ea5e9',
                  color: '#1e293b',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  width: '80px',
                  outline: 'none',
                  padding: '2px'
                }}
              />
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0ea5e9' }}>%</span>
            </div>
          </div>

          <button 
            onClick={handleUpdateConfig}
            disabled={savingConfig || nuevaComision === ''}
            style={{ 
              background: '#0ea5e9', 
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {savingConfig ? (
              <>
                <div style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                <span>Guardando...</span>
              </>
            ) : 'Actualizar'}
          </button>
        </div>

        {mensaje.texto && (
          <div style={{ 
            width: '100%', 
            marginTop: '16px', 
            padding: '12px 16px', 
            borderRadius: '12px',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: mensaje.tipo === 'success' ? '#f0fdf4' : '#fef2f2',
            color: mensaje.tipo === 'success' ? '#16a34a' : '#dc2626',
            border: `1px solid ${mensaje.tipo === 'success' ? '#dcfce7' : '#fee2e2'}`
          }}>
            {mensaje.tipo === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {mensaje.texto}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        
        .spin { animation: spin 0.8s linear infinite; }

        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-container { padding: 0 !important; margin: 0 !important; border: none !important; }
        }

        .is-exporting .no-print { display: none !important; }
        .is-exporting { 
          background: white !important; 
          padding: 20px 24px !important; 
          width: 1000px !important;
          margin: 0 auto !important;
          font-family: 'Inter', sans-serif !important;
          overflow: visible !important;
        }
        
        .is-exporting .recharts-responsive-container {
          width: 100% !important;
          height: 350px !important;
          min-height: 350px !important;
        }

        .is-exporting div[style*="grid-template-columns"] {
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 12px !important;
          margin-bottom: 24px !important;
        }

        .is-exporting div[style*="background: rgb(255, 255, 255)"] {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          padding: 15px !important;
          border-radius: 12px !important;
          border: 1px solid #e2e8f0 !important;
        }

        .is-exporting .config-section { display: none !important; }
      `}</style>
    </div>
  );
};

export default FinanzasAdmin;
