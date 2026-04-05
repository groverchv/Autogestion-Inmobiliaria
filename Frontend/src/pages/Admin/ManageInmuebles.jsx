import { useState, useEffect } from 'react';
import api from '../../services/api';
import AdminCrud from '../../components/AdminCrud';

const ManageInmuebles = () => {
  const [tipos, setTipos] = useState([]);

  useEffect(() => {
    api.get('/inmuebles/panel/tipos/').then(res => {
      const data = res.data.results || res.data;
      setTipos(data.map(t => ({ value: t.id, label: t.nombre })));
    }).catch(() => {});
  }, []);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'titulo', label: 'Título', render: (item) => <span style={{ fontWeight: 600 }}>{item.titulo}</span> },
    { key: 'tipo_nombre', label: 'Categoría', render: (item) => (
      <span style={{ background: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
        {item.tipo_nombre || 'N/A'}
      </span>
    )},
    { key: 'ciudad', label: 'Ciudad' },
    { key: 'zona', label: 'Zona' },
    { key: 'precio', label: 'Precio (Bs)', render: (item) => `Bs. ${parseFloat(item.precio || 0).toLocaleString()}` },
    { key: 'habitaciones', label: 'Hab.' },
    { key: 'banos', label: 'Baños' },
    { key: 'estado', label: 'Estado', render: (item) => {
      const colors = { disponible: '#16a34a', ocupado: '#dc2626', mantenimiento: '#f59e0b', reservado: '#3b82f6' };
      return <span style={{ color: colors[item.estado] || '#666', fontWeight: 600, textTransform: 'capitalize' }}>{item.estado}</span>;
    }},
  ];

  const formFields = [
    { key: 'titulo', label: 'Título', type: 'text', placeholder: 'ej: Casa en Zona Sur' },
    { key: 'descripcion', label: 'Descripción', type: 'textarea', placeholder: 'Descripción del inmueble...', required: false },
    { key: 'tipo', label: 'Categoría', type: 'select', options: tipos },
    { key: 'direccion', label: 'Dirección', type: 'text', placeholder: 'ej: Av. Principal 123' },
    { key: 'ciudad', label: 'Ciudad', type: 'text', placeholder: 'ej: La Paz' },
    { key: 'zona', label: 'Zona', type: 'text', placeholder: 'ej: Sur', required: false },
    { key: 'precio', label: 'Precio (Bs)', type: 'number', placeholder: '0.00' },
    { key: 'superficie', label: 'Superficie (m²)', type: 'number', placeholder: '0.00', required: false },
    { key: 'habitaciones', label: 'Habitaciones', type: 'number', placeholder: '0', defaultValue: 0 },
    { key: 'banos', label: 'Baños', type: 'number', placeholder: '0', defaultValue: 0 },
    { key: 'garaje', label: 'Garaje', type: 'boolean', defaultValue: false, required: false },
    { key: 'estado', label: 'Estado', type: 'select', options: [
      { value: 'disponible', label: 'Disponible' },
      { value: 'ocupado', label: 'Ocupado' },
      { value: 'mantenimiento', label: 'En Mantenimiento' },
      { value: 'reservado', label: 'Reservado' },
    ]},
  ];

  return (
    <AdminCrud
      title="Inmueble"
      subtitle="Gestión completa de propiedades inmobiliarias."
      endpoint="/inmuebles/panel/lista/"
      columns={columns}
      formFields={formFields}
    />
  );
};

export default ManageInmuebles;
