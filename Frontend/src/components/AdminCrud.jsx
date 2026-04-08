import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AdminCrud = ({ title, subtitle, endpoint, columns, formFields, idKey = 'id', transformPayload, transformEditItem }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Paginación & filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const ITEMS_PER_PAGE = 10;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoint);
      const data = res.data.results || res.data;
      // Orden descendente por ID
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => (b[idKey] || 0) - (a[idKey] || 0))
        : data;
      setItems(sorted);
    } catch (err) {
      console.error('Error fetching:', err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, idKey]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  // Filtrado por búsqueda
  const filtered = items.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return columns.some(col => {
      const val = item[col.key];
      return val != null && String(val).toLowerCase().includes(term);
    });
  });

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const openCreate = () => {
    setEditItem(null);
    const initial = {};
    formFields.forEach(f => { initial[f.key] = f.defaultValue ?? ''; });
    setFormData(initial);
    setError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    const initial = {};
    const processedItem = transformEditItem ? transformEditItem(item) : item;
    formFields.forEach(f => { initial[f.key] = processedItem[f.key] ?? ''; });
    setFormData(initial);
    setError('');
    setShowModal(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro?')) return;
    try {
      await api.delete(`${endpoint}${item[idKey]}/`);
      fetchItems();
    } catch (err) {
      alert('Error al eliminar: ' + (err.response?.data?.detail || 'Error desconocido'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = transformPayload ? transformPayload(formData) : formData;
      if (editItem) {
        await api.patch(`${endpoint}${editItem[idKey]}/`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      setShowModal(false);
      fetchItems();
    } catch (err) {
      const data = err.response?.data;
      if (data) {
        const msgs = Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
        setError(msgs.join(' | '));
      } else {
        setError('Error de conexión');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const s = {
    container: { background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' },
    title: { fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '4px' },
    subtitle: { color: '#64748b', fontSize: '0.85rem' },
    searchBar: { display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' },
    searchInput: { flex: 1, minWidth: '200px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', background: '#f8fafc', outline: 'none' },
    badge: { fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 },
    tableWrap: { overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    th: { padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px' },
    td: { padding: '12px 16px', fontSize: '0.85rem', color: '#334155', borderBottom: '1px solid #f1f5f9' },
    btnPrimary: { padding: '8px 18px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' },
    btnSecondary: { padding: '8px 18px', background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' },
    btnEdit: { padding: '5px 12px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 },
    btnDel: { padding: '5px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, marginLeft: '6px' },
    paginationWrap: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '8px' },
    paginationInfo: { fontSize: '0.8rem', color: '#94a3b8' },
    paginationBtns: { display: 'flex', gap: '4px' },
    pageBtn: (active) => ({ padding: '6px 12px', borderRadius: '8px', border: active ? 'none' : '1px solid #e2e8f0', background: active ? '#0ea5e9' : '#fff', color: active ? '#fff' : '#64748b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: active ? 700 : 500 }),
    overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { background: '#fff', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '500px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' },
    modalTitle: { fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px', color: '#1e293b' },
    fieldLabel: { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' },
    fieldInput: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', marginBottom: '14px', boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' },
    fieldSelect: { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem', marginBottom: '14px', boxSizing: 'border-box', background: '#fff' },
    errorBox: { padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626', marginBottom: '16px', fontSize: '0.8rem' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' },
    empty: { padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' },
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>{title}</h1>
          <p style={s.subtitle}>{subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={s.btnSecondary} onClick={fetchItems}>↻ Actualizar</button>
          <button style={s.btnPrimary} onClick={openCreate}>+ Crear</button>
        </div>
      </div>

      <div style={s.searchBar}>
        <input
          style={s.searchInput}
          type="text"
          placeholder="🔍 Buscar en todos los campos..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <span style={s.badge}>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Cargando...</p>
      ) : (
        <>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {columns.map(col => <th key={col.key} style={s.th}>{col.label}</th>)}
                  <th style={{ ...s.th, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(item => (
                  <tr key={item[idKey]} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                    {columns.map(col => (
                      <td key={col.key} style={s.td}>
                        {col.render ? col.render(item) : (item[col.key] ?? '—')}
                      </td>
                    ))}
                    <td style={{ ...s.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button style={s.btnEdit} onClick={() => openEdit(item)}>Editar</button>
                      <button style={s.btnDel} onClick={() => handleDelete(item)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={columns.length + 1} style={s.empty}>No hay registros.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div style={s.paginationWrap}>
            <span style={s.paginationInfo}>
              Mostrando {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length}
            </span>
            <div style={s.paginationBtns}>
              <button style={s.pageBtn(false)} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} style={s.pageBtn(p === currentPage)} onClick={() => setCurrentPage(p)}>{p}</button>
              ))}
              <button style={s.pageBtn(false)} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div style={s.overlay} onClick={() => setShowModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>{editItem ? `Editar ${title}` : `Crear ${title}`}</h2>
            {error && <div style={s.errorBox}>{error}</div>}
            <form onSubmit={handleSubmit}>
              {formFields.map(field => (
                <div key={field.key}>
                  <label style={s.fieldLabel}>{field.label}{field.required !== false && ' *'}</label>
                  {field.type === 'select' ? (
                    <select style={s.fieldSelect} value={formData[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)} required={field.required !== false}>
                      <option value="">— Seleccionar —</option>
                      {(field.options || []).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea style={{ ...s.fieldInput, minHeight: '80px', resize: 'vertical' }} value={formData[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)} placeholder={field.placeholder || ''} required={field.required !== false} />
                  ) : field.type === 'boolean' ? (
                    <select style={s.fieldSelect} value={formData[field.key] === true || formData[field.key] === 'true' ? 'true' : 'false'} onChange={e => handleChange(field.key, e.target.value === 'true')}>
                      <option value="true">Sí</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <input style={s.fieldInput} type={field.type || 'text'} value={formData[field.key] || ''} onChange={e => handleChange(field.key, e.target.value)} placeholder={field.placeholder || ''} required={field.required !== false} step={field.type === 'number' ? 'any' : undefined} />
                  )}
                </div>
              ))}
              <div style={s.modalActions}>
                <button type="button" style={s.btnSecondary} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" style={s.btnPrimary} disabled={saving}>{saving ? 'Guardando...' : editItem ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCrud;
