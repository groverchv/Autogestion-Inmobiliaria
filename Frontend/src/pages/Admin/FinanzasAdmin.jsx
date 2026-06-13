import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { TrendingUp, Settings, DollarSign, FileText, FileSpreadsheet, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import reportesService from '../../services/reportesService';
import configuracionService from '../../services/configuracionService';
import FiltroReportes from '../../components/FiltroReportes';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import './Finanzas.css';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];

/** Renderiza etiqueta EXTERNA para cada segmento del Pie (porcentaje fuera del pastel) */
const renderEtiquetaPie = ({ cx, cy, midAngle, outerRadius, percent, index }) => {
  const RADIAN = Math.PI / 180;
  // Posicionar la etiqueta fuera del pastel
  const radius = outerRadius + 22;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const labelText = `${(percent * 100).toFixed(0)}%`;
  const textAnchor = x > cx ? 'start' : 'end';

  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="central"
      fill={COLORS[index % COLORS.length]}
      fontSize={13}
      fontWeight={800}
    >
      {labelText}
    </text>
  );
};

const FinanzasAdmin = () => {
  const [reportData, setReportData] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [filtros, setFiltros] = useState({ rango: 'ultimos_12_meses' });
  const [nuevaComision, setNuevaComision] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' }); // tipo: 'success' | 'error'

  useEffect(() => {
    fetchData();
  }, [filtros]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resReportes, resConfig] = await Promise.all([
        reportesService.obtenerReportes(filtros),
        configuracionService.obtenerConfiguracion()
      ]);
      setReportData(resReportes);
      setConfig(resConfig);
      setNuevaComision(resConfig?.porcentaje_comision_plataforma || '');
    } catch (err) {
      console.error("Error fetching admin finances:", err);
      setError("No se pudo cargar la información financiera. Verifica la conexión.");
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
      const anio = filtros.anio || new Date().getFullYear();
      const mesNum = filtros.mes;
      const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const mesNombre = mesNum ? mesesNombres[parseInt(mesNum) - 1] : 'Todos los meses';
      
      const ciudad = filtros.ciudad || 'Todas las ciudades';
      const tipoContrato = filtros.tipo_contrato ? 'Filtrado' : 'Todos los contratos';

      // Encabezado informativo (filas superiores)
      const encabezado = [
        [`Reporte de Comisiones — Gestión ${anio}${mesNum ? ` (${mesNombre})` : ''}`],
        [`Ciudad: ${ciudad}  |  Contrato: ${tipoContrato}  |  Generado: ${new Date().toLocaleDateString('es-BO')}`],
        [],  // fila vacía de separación
      ];

      // Filas de datos (réplica exacta de la tabla del dashboard)
      const detalles = (reportData?.tabla_detalles || []);
      const filasDatos = detalles.map(fila => ([
        fila.fecha,
        fila.inmueble,
        fila.ciudad,
        fila.tipo_contrato,
        fila.inquilino,
        fila.monto,
      ]));

      // Sumatoria total
      const totalMonto = detalles.reduce((acc, fila) => acc + (fila.monto || 0), 0);

      // Construir la hoja manualmente para control total del layout
      const ws = XLSX.utils.aoa_to_sheet([
        ...encabezado,
        ['Fecha', 'Inmueble', 'Ciudad', 'Tipo Contrato', 'Inquilino', 'Ingreso (Bs)'],
        ...filasDatos,
        [],
        ['', '', '', '', 'TOTAL:', totalMonto],
      ]);

      // Anchos de columna
      ws['!cols'] = [
        { wch: 14 },  // Fecha
        { wch: 30 },  // Inmueble
        { wch: 18 },  // Ciudad
        { wch: 18 },  // Tipo Contrato
        { wch: 22 },  // Inquilino
        { wch: 16 },  // Ingreso
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Detalle Comisiones');

      XLSX.writeFile(wb, `reporte_comisiones_${anio}_${mesNombre.replace(/ /g, '_')}_${ciudad.replace(/ /g, '_')}.xlsx`);
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
      margin:       [8, 8],
      filename:     `reporte_admin_financiero_${filtros.anio || new Date().getFullYear()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false, scrollY: 0 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak:    { mode: ['css', 'legacy'], before: '.pdf-page-break' }
    };

    setExporting(true);
    element.classList.add('is-exporting');

    html2pdf().set(opt).from(element).save().then(() => {
      element.classList.remove('is-exporting');
      setExporting(false);
    });
  };

  const formatterMonto = (value) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(value);

  // Componente interno para Skeletons
  const Skeleton = ({ width, height, borderRadius = '12px', style = {} }) => (
    <div style={{
      width, height, borderRadius, ...style,
      background: '#e2e8f0',
      opacity: 0.7
    }} />
  );

  return (
    <div className="print-container" style={{ padding: '0px' }}>
      {/* Header */}
      <div className="finanzas-admin-header" style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text)', marginBottom: '4px' }}>
            Análisis Financiero Global
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Monitoreo de ingresos por comisiones y configuración de parámetros transaccionales.
          </p>
        </div>

        <div className="finanzas-admin-buttons" style={{ display: 'flex', gap: '16px' }}>
          <button
            className="no-print"
            onClick={handleDownloadPDF}
            disabled={exporting}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--color-border)',
              background: 'var(--color-bg-card)', color: 'var(--color-text)', fontWeight: 600, cursor: exporting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem',
              boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s'
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
              padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--color-border)',
              background: 'var(--color-bg-card)', color: 'var(--color-text)', fontWeight: 600, cursor: exportingExcel ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem',
              boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s'
            }}
          >
            {exportingExcel ? <Clock className="spin" size={16} /> : <FileSpreadsheet size={16} />}
            {exportingExcel ? 'Generando...' : 'Data Excel'}
          </button>
        </div>
      </div>
      
      <FiltroReportes onFilterChange={setFiltros} showInmuebleFilter={false} />

      {/* ===== ENCABEZADO EXCLUSIVO PARA PDF ===== */}
      <div className="pdf-header-admin print-only" style={{ display: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--color-border)', paddingBottom: '10px', marginBottom: '14px' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.5px' }}>
              REPORTE FINANCIERO GLOBAL
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
              Análisis de Ingresos por Comisiones de Plataforma
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              Año Fiscal: {filtros.anio || new Date().getFullYear()} {filtros.mes ? `(${['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][parseInt(filtros.mes)-1]})` : ''}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
              Generado: {new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
      {/* ===== FIN ENCABEZADO PDF ===== */}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={24} />
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600 }}>Error de Carga</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>{error}</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="pdf-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <DollarSign size={24} />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: '4px' }}>Ingresos por Comisiones</p>
          <div style={{ fontSize: 'clamp(1.2rem, 5vw, 1.8rem)', fontWeight: 800, color: '#16a34a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {loading ? <Skeleton width="120px" height="32px" /> : formatterMonto(reportData?.kpis?.total_ingreso_comisiones || 0)}
          </div>
        </div>

        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#e0f2fe', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <TrendingUp size={24} />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: '4px' }}>Pagos Procesados</p>
          <div style={{ fontSize: 'clamp(1.2rem, 5vw, 1.8rem)', fontWeight: 800, color: '#0ea5e9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {loading ? <Skeleton width="80px" height="32px" /> : (reportData?.kpis?.total_pagos_exitosos || 0)}
          </div>
        </div>

        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <FileText size={24} />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500, marginBottom: '4px' }}>Contratos Activos</p>
          <div style={{ fontSize: 'clamp(1.2rem, 5vw, 1.8rem)', fontWeight: 800, color: '#f59e0b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {loading ? <Skeleton width="80px" height="32px" /> : (reportData?.kpis?.contratos_activos || 0)}
          </div>
        </div>
      </div>

      {/* Config Section */}
      <div className="config-section no-print" style={{ 
        background: 'var(--color-bg-card)', 
        borderRadius: '16px', 
        border: '1px solid var(--color-border)', 
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
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Gestión de Comisiones</h3>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
            Ajusta el porcentaje global que la plataforma retiene por cada transacción.
          </p>
        </div>

        <div style={{ 
          background: 'var(--color-bg-secondary)', 
          padding: '16px 24px', 
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
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
                  color: 'var(--color-text)',
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

      {/* Charts Section */}
      <div className="pdf-charts-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* Main Chart */}
        <div className="pdf-chart-bar" style={{ background: 'var(--color-bg-card)', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '24px', gridColumn: 'span 2', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <TrendingUp size={20} color="#0ea5e9" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              Evolución de Ingresos (Comisiones)
            </h2>
          </div>

          <div style={{ height: 300, width: '100%', minWidth: 0 }}>
            {loading ? (
              <Skeleton width="100%" height="100%" borderRadius="8px" />
            ) : reportData?.grafico_evolucion?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={reportData?.grafico_evolucion}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis
                    dataKey="fecha"
                    stroke="var(--color-text-muted)"
                    tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                    tickFormatter={(val) => {
                      if (!val || typeof val !== 'string') return val;
                      const parts = val.split('-');
                      
                      // Si hay 3 partes (YYYY-MM-DD), es vista diaria
                      if (parts.length === 3) {
                        return parts[2]; // Retornar el día
                      }
                      
                      // Si hay 2 partes (YYYY-MM), es vista mensual
                      if (parts.length === 2) {
                        const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                        const m = parseInt(parts[1], 10);
                        return meses[m - 1] || val;
                      }
                      
                      return val;
                    }}
                  />
                  <YAxis stroke="var(--color-text-muted)" tickFormatter={(value) => `${value}`} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: 'var(--color-bg-hover)' }}
                    formatter={(value) => [formatterMonto(value), 'Comisión']}
                    contentStyle={{ background: 'var(--color-bg-card)', color: 'var(--color-text)', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}
                  />
                  <Bar dataKey="ingreso" radius={[4, 4, 0, 0]} barSize={40} fill="#0ea5e9">
                    {(reportData?.grafico_evolucion || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0ea5e9' : '#0284c7'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                No hay datos suficientes para mostrar en este periodo.
              </div>
            )}
          </div>
        </div>
 
        {/* Pie Chart */}
        <div className="pdf-chart-pie" style={{ background: 'var(--color-bg-card)', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '24px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <FileText size={20} color="#8b5cf6" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              Ingresos por Tipo de Contrato
            </h2>
          </div>
 
          <div style={{ height: 300, width: '100%', minWidth: 0 }}>
            {loading ? (
              <Skeleton width="100%" height="100%" borderRadius="8px" />
            ) : reportData?.grafico_contratos?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart margin={{ top: 0, right: 30, bottom: 0, left: 30 }}>
                  <Pie
                    data={reportData?.grafico_contratos}
                    dataKey="ingreso"
                    nameKey="contrato"
                    cx="50%"
                    cy="45%"
                    outerRadius={85}
                    labelLine={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
                    label={renderEtiquetaPie}
                  >
                    {(reportData?.grafico_contratos || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="var(--color-bg-card)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatterMonto(value), 'Ingresos']}
                    contentStyle={{ background: 'var(--color-bg-card)', color: 'var(--color-text)', borderRadius: '10px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)', fontSize: '0.85rem' }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="square"
                    iconSize={12}
                    formatter={(value) => (
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.9rem', textAlign: 'center' }}>
                No hay datos suficientes para segmentar por tipo de contrato.
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Data Table Section - nueva página en PDF */}
      <div className="pdf-table-section no-print" style={{ background: 'var(--color-bg-card)', borderRadius: '16px', border: '1px solid var(--color-border)', padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <FileSpreadsheet size={20} color="#10b981" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Detalle de Comisiones (Últimos Registros)
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {loading ? (
             <Skeleton width="100%" height="200px" borderRadius="8px" />
          ) : reportData?.tabla_detalles?.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)', borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Fecha</th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Inmueble</th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Ciudad</th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Tipo Contrato</th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Inquilino</th>
                  <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontWeight: 600, textAlign: 'right' }}>Ingreso (Bs)</th>
                </tr>
              </thead>
              <tbody>
                {reportData.tabla_detalles.map((fila, idx) => (
                  <tr key={fila.id} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'var(--color-bg-card)' : 'var(--color-bg-secondary)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{fila.fecha}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text)', fontWeight: 500 }}>{fila.inmueble}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{fila.ciudad}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: 'rgba(79, 70, 229, 0.15)', color: '#818cf8', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                        {fila.tipo_contrato}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{fila.inquilino}</td>
                    <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 700, textAlign: 'right' }}>
                      {formatterMonto(fila.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ display: 'flex', height: '100px', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>
              No se encontraron registros detallados para los filtros seleccionados.
            </div>
          )}
        </div>
      </div>



      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .spin { animation: spin 0.8s linear infinite; }

        /* ============ IMPRESIÓN NATIVA (Ctrl+P) ============ */
        .print-only { display: none !important; }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .print-container { padding: 0 !important; margin: 0 !important; }
          @page { size: A4 landscape; margin: 10mm; }
        }

        /* ============ EXPORTACIÓN html2pdf (A4 LANDSCAPE) ============ */

        /* 1. Activar encabezado PDF, ocultar UI interactiva */
        .is-exporting .print-only { display: block !important; }
        .is-exporting .no-print { display: none !important; }
        .is-exporting .filtro-reportes-container { display: none !important; }
        .is-exporting .config-section { display: none !important; }

        /* 2. Contenedor raíz: ancho A4 landscape */
        .is-exporting {
          background: white !important;
          width: 1050px !important;
          margin: 0 auto !important;
          padding: 0 16px 16px 16px !important;
          font-family: 'Inter', 'Segoe UI', sans-serif !important;
          box-sizing: border-box !important;
          overflow: visible !important;
        }

        /* 3. Encabezado PDF visible */
        .is-exporting .pdf-header-admin {
          display: block !important;
          margin-bottom: 10px !important;
        }

        /* 4. KPIs: fila horizontal compacta */
        .is-exporting .pdf-kpi-grid {
          display: flex !important;
          flex-direction: row !important;
          gap: 10px !important;
          margin-bottom: 12px !important;
          break-inside: avoid !important;
        }
        .is-exporting .pdf-kpi-grid > div {
          flex: 1 !important;
          padding: 8px 12px !important;
          border-radius: 10px !important;
        }
        .is-exporting .pdf-kpi-grid > div > div:first-child {
          width: 26px !important;
          height: 26px !important;
          margin-bottom: 4px !important;
        }
        .is-exporting .pdf-kpi-grid p { font-size: 0.68rem !important; margin-bottom: 2px !important; }
        .is-exporting .pdf-kpi-grid div[style*="1.8rem"] { font-size: 1.15rem !important; }

        /* 5. Sección de gráficos: FILA (lado a lado) para compactar */
        .is-exporting .pdf-charts-section {
          display: flex !important;
          flex-direction: row !important;
          gap: 12px !important;
          margin-bottom: 12px !important;
          align-items: stretch !important;
        }

        /* 6. Gráfico de barras (60% del ancho) */
        .is-exporting .pdf-chart-bar {
          flex: 3 !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          padding: 12px 16px !important;
          border-radius: 10px !important;
          box-sizing: border-box !important;
        }
        .is-exporting .pdf-chart-bar > div[style*="height"] {
          height: 180px !important;
          max-height: 180px !important;
          min-height: 180px !important;
        }
        .is-exporting .pdf-chart-bar h2 { font-size: 0.85rem !important; margin-bottom: 4px !important; }

        /* 7. Gráfico de torta (40% del ancho) */
        .is-exporting .pdf-chart-pie {
          flex: 2 !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
          padding: 12px 16px !important;
          border-radius: 10px !important;
          box-sizing: border-box !important;
        }
        .is-exporting .pdf-chart-pie > div[style*="height"] {
          height: 180px !important;
          max-height: 180px !important;
          min-height: 180px !important;
        }
        .is-exporting .pdf-chart-pie h2 { font-size: 0.85rem !important; margin-bottom: 4px !important; }

        /* 8. Recharts - ancho total */
        .is-exporting .recharts-responsive-container {
          width: 100% !important;
        }

        /* 9. Tabla de detalle: nueva página */
        .is-exporting .pdf-table-section {
          display: block !important;
          break-before: always !important;
          page-break-before: always !important;
          padding: 14px !important;
          border-radius: 10px !important;
          margin-top: 0 !important;
        }
        .is-exporting .pdf-table-section h2 { font-size: 0.9rem !important; margin-bottom: 10px !important; }
        .is-exporting .pdf-table-section table { font-size: 0.75rem !important; }
        .is-exporting .pdf-table-section th,
        .is-exporting .pdf-table-section td { padding: 5px 8px !important; }
        .is-exporting .pdf-table-section span { padding: 2px 5px !important; font-size: 0.7rem !important; }
      `}</style>
    </div>
  );
};

export default FinanzasAdmin;
