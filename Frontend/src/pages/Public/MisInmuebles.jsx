import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Check, X, Clock, Trash2, Tag, Megaphone, Plus, Calendar, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Configurar marker por defecto de Leaflet
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

import Navbar from '../../components/Navbar';
import UserMenu from '../../components/UserMenu';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import './Propiedades.css';

const LocationPicker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
};

const MisInmuebles = () => {
  const { isAuthenticated } = useAuth();

  const [inmuebles, setInmuebles] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [archivos, setArchivos] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [existingMedia, setExistingMedia] = useState([]);
  const [mediaToDelete, setMediaToDelete] = useState([]);

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    tipo: '',
    ciudad: '',
    zona: '',
    calle: '',
    referencia: '',
    valor_activo: '',
    largo: '',
    ancho: '',
    superficie: '',
    habitaciones: 0,
    banos: 0,
    garaje: false,
    estado: 'disponible',
    gps: ''
  });

  const [saving, setSaving] = useState(false);
  const [showHorarioModal, setShowHorarioModal] = useState(false);
  const [inmuebleHorarioId, setInmuebleHorarioId] = useState(null);
  const [horarios, setHorarios] = useState([]);
  const [nuevoHorario, setNuevoHorario] = useState({ dia_semana: 0, hora_inicio: '09:00', hora_fin: '18:00' });
  const [guardandoHorario, setGuardandoHorario] = useState(false);

  const [showPubModal, setShowPubModal] = useState(false);
  const [selectedInmId, setSelectedInmId] = useState(null);
  const [publications, setPublications] = useState([]);
  const [loadingPubs, setLoadingPubs] = useState(false);
  const [savingPub, setSavingPub] = useState(false);
  const [newPubFormData, setNewPubFormData] = useState({
    tipo_oferta: 'alquiler',
    precio: '',
    estado: 'activa'
  });

  const DIAS_NOMBRES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const abrirPublicaciones = async (inmId) => {
    setSelectedInmId(inmId);
    setLoadingPubs(true);
    setShowPubModal(true);
    try {
      const res = await api.get('/inmuebles/panel/publicaciones/', { params: { inmueble: inmId } });
      setPublications(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
      setPublications([]);
    } finally {
      setLoadingPubs(false);
    }
  };

  const crearPublicacion = async (e) => {
    e.preventDefault();
    if (!newPubFormData.precio || parseFloat(newPubFormData.precio) < 0) {
      alert('Por favor ingrese un precio válido.');
      return;
    }
    setSavingPub(true);
    try {
      await api.post('/inmuebles/panel/publicaciones/', {
        inmueble: selectedInmId,
        tipo_oferta: newPubFormData.tipo_oferta,
        precio: parseFloat(newPubFormData.precio),
        estado: newPubFormData.estado
      });
      // Recargar publicaciones
      const res = await api.get('/inmuebles/panel/publicaciones/', { params: { inmueble: selectedInmId } });
      setPublications(res.data.results || res.data || []);
      // Reset form
      setNewPubFormData({ tipo_oferta: 'alquiler', precio: '', estado: 'activa' });
      // Recargar catálogo de mis inmuebles para reflejar cambios de precio en las tarjetas
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error al crear publicación: ' + (err.response?.data?.detail || 'Intente de nuevo.'));
    } finally {
      setSavingPub(false);
    }
  };

  const cambiarEstadoPublicacion = async (pubId, nuevoEstado) => {
    try {
      await api.patch(`/inmuebles/panel/publicaciones/${pubId}/`, { estado: nuevoEstado });
      // Recargar publicaciones
      const res = await api.get('/inmuebles/panel/publicaciones/', { params: { inmueble: selectedInmId } });
      setPublications(res.data.results || res.data || []);
      // Recargar catálogo de mis inmuebles para reflejar cambios
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error al cambiar el estado de la publicación.');
    }
  };

  const abrirHorarios = async (inmId) => {
    setInmuebleHorarioId(inmId);
    try {
      const res = await api.get('/inmuebles/horarios/', { params: { inmueble: inmId } });
      setHorarios(res.data.results || res.data || []);
    } catch { setHorarios([]); }
    setShowHorarioModal(true);
  };

  const agregarHorario = async () => {
    if (!nuevoHorario.hora_inicio || !nuevoHorario.hora_fin) return;
    setGuardandoHorario(true);
    try {
      await api.post('/inmuebles/horarios/', {
        ...nuevoHorario,
        inmueble: inmuebleHorarioId,
        hora_inicio: nuevoHorario.hora_inicio + ':00',
        hora_fin: nuevoHorario.hora_fin + ':00',
      });
      const res = await api.get('/inmuebles/horarios/', { params: { inmueble: inmuebleHorarioId } });
      setHorarios(res.data.results || res.data || []);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al agregar horario');
    } finally { setGuardandoHorario(false); }
  };

  const eliminarHorario = async (horarioId) => {
    if (!window.confirm('¿Eliminar este horario?')) return;
    try {
      await api.delete(`/inmuebles/horarios/${horarioId}/`);
      setHorarios(prev => prev.filter(h => h.id !== horarioId));
    } catch { alert('Error al eliminar horario'); }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inmRes, tipRes] = await Promise.all([
        api.get('/inmuebles/panel/lista/'),
        api.get('/inmuebles/tipos/')
      ]);
      setInmuebles(inmRes.data.results || inmRes.data);
      setTipos(tipRes.data.results || tipRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    let { name, value, type, checked } = e.target;
    if (type === 'number' && value !== '') {
      value = value.replace(/^-/, '');
      if (Number(value) < 0) return;
    }
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Auto-calcular superficie en tiempo real
      if (name === 'largo' || name === 'ancho') {
        const l = parseFloat(newData.largo);
        const a = parseFloat(newData.ancho);
        if (!isNaN(l) && !isNaN(a)) {
          newData.superficie = (l * a).toFixed(2);
        } else {
          newData.superficie = '';
        }
      }

      return newData;
    });
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);

    // Acumulamos archivos para permitir múltiples selecciones sucesivas
    setArchivos(prev => [...prev, ...newFiles]);

    // Crear URLs de preview
    const newPreviews = newFiles.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type,
      name: f.name
    }));
    setPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (indexToRemove) => {
    setArchivos(prev => prev.filter((_, i) => i !== indexToRemove));
    setPreviewUrls(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleEdit = async (inm) => {
    try {
      setLoading(true);
      const res = await api.get(`/inmuebles/lista/${inm.id}/`);
      const detailedInm = res.data;

      setEditingId(detailedInm.id);
      setFormData({
        titulo: detailedInm.titulo || '',
        descripcion: detailedInm.descripcion || '',
        tipo: detailedInm.tipo || (tipos.length > 0 ? tipos[0].id : ''),
        ciudad: detailedInm.direccion?.ciudad || '',
        zona: detailedInm.direccion?.zona || '',
        calle: detailedInm.direccion?.calle || '',
        referencia: detailedInm.direccion?.referencia || '',
        valor_activo: detailedInm.valor_activo || '',
        largo: detailedInm.largo || '',
        ancho: detailedInm.ancho || '',
        superficie: detailedInm.superficie || '',
        habitaciones: detailedInm.habitaciones || 0,
        banos: detailedInm.banos || 0,
        garaje: detailedInm.garaje || false,
        estado: detailedInm.estado || 'disponible',
        gps: detailedInm.gps || ''
      });
      setArchivos([]);
      setPreviewUrls([]);
      setExistingMedia(detailedInm.multimedia || []);
      setMediaToDelete([]);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      alert('Error fetching inmueble details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };

      payload.direccion = {
        ciudad: payload.ciudad || '',
        zona: payload.zona || '',
        calle: payload.calle || '',
        referencia: payload.referencia || ''
      };
      delete payload.ciudad;
      delete payload.zona;
      delete payload.calle;
      delete payload.referencia;

      if (payload.superficie === '') payload.superficie = null;
      if (payload.largo === '') payload.largo = null;
      if (payload.ancho === '') payload.ancho = null;

      let nuevoInmuebleId;
      if (editingId) {
        await api.put(`/inmuebles/panel/lista/${editingId}/`, payload);
        nuevoInmuebleId = editingId;

        if (mediaToDelete.length > 0) {
          const deletePromises = mediaToDelete.map(mediaId =>
            api.delete(`/inmuebles/multimedia/${mediaId}/`)
          );
          await Promise.all(deletePromises);
        }
      } else {
        const res = await api.post('/inmuebles/panel/lista/', payload);
        nuevoInmuebleId = res.data.id;
      }

      // Subir imágenes/videos a Cloudinary vía el backend
      if (archivos.length > 0) {
        const currentPrincipalExists = existingMedia.some(m => m.principal);
        const uploadPromises = archivos.map(async (file, i) => {
          const mediaForm = new FormData();
          mediaForm.append('inmueble', nuevoInmuebleId);
          mediaForm.append('archivo', file);
          mediaForm.append('principal', (!currentPrincipalExists && i === 0) ? 'true' : 'false');
          mediaForm.append('tipo', file.type.startsWith('video/') ? 'video' : 'imagen');

          return api.post('/inmuebles/multimedia/', mediaForm, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        });
        await Promise.all(uploadPromises);
      }

      setShowModal(false);
      setEditingId(null);
      setExistingMedia([]);
      setMediaToDelete([]);
      setFormData({
        titulo: '', descripcion: '', tipo: tipos.length > 0 ? tipos[0].id : '',
        ciudad: '', zona: '', calle: '', referencia: '', valor_activo: '', largo: '', ancho: '', superficie: '',
        habitaciones: 0, banos: 0, garaje: false, estado: 'disponible',
        gps: ''
      });
      setArchivos([]);
      setPreviewUrls([]);
      fetchData(); // Recargar
    } catch (err) {
      console.error(err);
      alert('Error al registrar inmueble');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar el inmueble?')) return;
    try {
      await api.delete(`/inmuebles/panel/lista/${id}/`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error eliminando inmueble');
    }
  };

  const handleToggleVisibilidad = async (inm) => {
    try {
      const nuevoEstado = inm.estado === 'oculto' ? 'disponible' : 'oculto';
      await api.patch(`/inmuebles/panel/lista/${inm.id}/`, { estado: nuevoEstado });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error cambiando estado');
    }
  };

  const estadoColors = {
    disponible: { bg: '#dcfce7', color: '#15803d' },
    ocupado: { bg: '#fee2e2', color: '#dc2626' },
    mantenimiento: { bg: '#fef3c7', color: '#d97706' },
    reservado: { bg: '#dbeafe', color: '#2563eb' },
    oculto: { bg: '#f3f4f6', color: '#6b7280' },
  };

  return (
    <div className="propiedades-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Navbar />
      <UserMenu />

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--color-text)', margin: 0 }}>Mis Inmuebles</h1>
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  titulo: '', descripcion: '', tipo: tipos.length > 0 ? tipos[0].id : '',
                  ciudad: '', zona: '', calle: '', referencia: '', valor_activo: '', largo: '', ancho: '', superficie: '',
                  habitaciones: 0, banos: 0, garaje: false, estado: 'disponible',
                  gps: ''
                });
                setArchivos([]);
                setPreviewUrls([]);
                setExistingMedia([]);
                setMediaToDelete([]);
                setShowModal(true);
              }}
              style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
            >
              + Registrar Inmueble
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Cargando tus inmuebles...</div>
          ) : inmuebles.length === 0 ? (
            <div style={{ background: '#fff', padding: '60px 20px', textAlign: 'center', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-bg)', color: 'var(--color-primary)', marginBottom: '16px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
              </div>
              <h2 style={{ margin: '0 0 8px 0', color: 'var(--color-text)' }}>No tienes inmuebles registrados</h2>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Tus propiedades publicadas aparecerán aquí y en el catálogo público.</p>
              <button
                onClick={() => {
                  if (tipos.length > 0 && !formData.tipo) setFormData(p => ({ ...p, tipo: tipos[0].id }));
                  setShowModal(true);
                }}
                style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Registrar mi primer Inmueble
              </button>
            </div>
          ) : (
            <div className="propiedades-grid">
              {inmuebles.map(inm => {
                const estadoStyle = estadoColors[inm.estado] || estadoColors.disponible;
                return (
                  <div key={inm.id} className="propiedad-card">
                    <div className="propiedad-card__image" style={{ height: '200px' }}>
                      {inm.imagen_principal ? (
                        <img src={inm.imagen_principal} alt={inm.titulo} />
                      ) : (
                        <div className="propiedad-card__placeholder">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        </div>
                      )}
                      <span className="propiedad-card__badge" style={{ background: estadoStyle.bg, color: estadoStyle.color }}>
                        {inm.estado}
                      </span>
                    </div>
                    <div className="propiedad-card__body">
                      <h3 className="propiedad-card__title">{inm.titulo}</h3>
                      <p className="propiedad-card__location">{inm.ciudad}{inm.zona ? `, ${inm.zona}` : ''}</p>

                      <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                        <span className="propiedad-card__price">
                          {inm.precio ? (
                            <>{`Bs. ${parseFloat(inm.precio).toLocaleString()}`}
                              {inm.tipo_oferta === 'alquiler' && <small style={{ fontSize: '0.75rem', fontWeight: 'normal', marginLeft: '4px' }}>/mes</small>}
                              {inm.tipo_oferta === 'anticretico' && <small style={{ fontSize: '0.75rem', fontWeight: 'normal', marginLeft: '4px' }}>(Anticrético)</small>}
                            </>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600, background: '#fef3c7', padding: '4px 10px', borderRadius: '20px', border: '1px solid #fde68a' }}>
                              <AlertCircle size={13} /> Sin publicación activa
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Acciones — grid de botones con etiquetas */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                        <button
                          onClick={() => abrirPublicaciones(inm.id)}
                          style={{
                            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                            borderRadius: '8px', padding: '8px 6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            color: '#10b981', fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.2s',
                          }}
                          title="Gestionar ofertas comerciales (publicaciones)"
                        >
                          <Tag size={14} /> Publicar
                        </button>
                        <button
                          onClick={() => abrirHorarios(inm.id)}
                          style={{
                            background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)',
                            borderRadius: '8px', padding: '8px 6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            color: '#0ea5e9', fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.2s',
                          }}
                          title="Gestionar horarios de visita"
                        >
                          <Clock size={14} /> Horarios
                        </button>
                        <button
                          onClick={() => handleEdit(inm)}
                          style={{
                            background: 'rgba(100,116,139,0.06)', border: '1px solid var(--color-border)',
                            borderRadius: '8px', padding: '8px 6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            color: 'var(--color-text-secondary)', fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.2s',
                          }}
                          title="Editar datos del inmueble"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleVisibilidad(inm)}
                          style={{
                            background: inm.estado === 'oculto' ? 'rgba(14,165,233,0.06)' : 'rgba(100,116,139,0.06)',
                            border: `1px solid ${inm.estado === 'oculto' ? 'rgba(14,165,233,0.2)' : 'var(--color-border)'}`,
                            borderRadius: '8px', padding: '8px 6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            color: inm.estado === 'oculto' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.2s',
                          }}
                          title={inm.estado === 'oculto' ? 'Mostrar al público' : 'Ocultar del catálogo'}
                        >
                          {inm.estado === 'oculto' ? (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg> Mostrar</>
                          ) : (
                            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg> Ocultar</>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(inm.id)}
                          style={{
                            background: 'rgba(239,68,68,0.05)', border: '1px solid #fecaca',
                            borderRadius: '8px', padding: '8px 6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            color: '#ef4444', fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.2s',
                          }}
                          title="Eliminar inmueble"
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                        <Link
                          to={`/propiedades/${inm.id}`}
                          style={{
                            background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)',
                            borderRadius: '8px', padding: '8px 6px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                            color: 'var(--color-primary)', fontSize: '0.72rem', fontWeight: 600,
                            textDecoration: 'none', transition: 'all 0.2s',
                          }}
                        >
                          <Megaphone size={14} /> Ver
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '700px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{editingId ? 'Editar Inmueble' : 'Registrar Inmueble'}</h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >&times;</button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <form id="inmuebleForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Título *</label>
                    <input required type="text" name="titulo" value={formData.titulo} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Tipo *</label>
                    <select required name="tipo" value={formData.tipo} onChange={handleChange} className="propiedades-filter__select" style={{ width: '100%' }}>
                      {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Ciudad *</label>
                    <input required type="text" name="ciudad" value={formData.ciudad} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Zona</label>
                    <input type="text" name="zona" value={formData.zona} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Calle *</label>
                    <input required type="text" name="calle" value={formData.calle} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Referencia</label>
                    <input type="text" name="referencia" value={formData.referencia} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Largo (m) *</label>
                    <input required type="number" min="0" step="0.01" name="largo" value={formData.largo} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Ancho (m) *</label>
                    <input required type="number" min="0" step="0.01" name="ancho" value={formData.ancho} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Superficie (m²)</label>
                    <input type="text" value={formData.superficie} disabled placeholder="Calculado auto." className="propiedades-filter__input" style={{ width: '100%', background: '#f8fafc', color: '#64748b', fontWeight: 600 }} />
                  </div>
                </div>

                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#92400e' }}>
                      Valor del Activo (Bs)
                    </label>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '20px', border: '1px solid #fde68a', textTransform: 'uppercase' }}>
                      Interno
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#92400e', marginBottom: '10px', lineHeight: '1.4' }}>
                    Valor catastral o de referencia del activo físico (DDRR). No se muestra en el catálogo público.
                  </p>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="valor_activo"
                    value={formData.valor_activo}
                    onChange={handleChange}
                    placeholder="Ej: 350000"
                    className="propiedades-filter__input"
                    style={{ width: '100%', maxWidth: '280px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Habitaciones</label>
                    <input type="number" min="0" name="habitaciones" value={formData.habitaciones} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Baños</label>
                    <input type="number" min="0" name="banos" value={formData.banos} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" name="garaje" checked={formData.garaje} onChange={handleChange} />
                      Tiene Garaje
                    </label>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Descripción</label>
                  <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows="4" className="propiedades-filter__input" style={{ width: '100%', resize: 'vertical' }}></textarea>
                </div>

                <div style={{ background: 'var(--color-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    Ubicación GPS
                  </label>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                    Haz clic en el mapa para marcar la ubicación, o usa tu ubicación actual.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => setFormData(prev => ({ ...prev, gps: `${pos.coords.latitude}, ${pos.coords.longitude}` })),
                          () => alert('Error obteniendo ubicación. Verifica los permisos de tu navegador.')
                        );
                      }
                    }}
                    style={{ marginBottom: '16px', background: 'var(--color-secondary, #475569)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} /> Usar mi ubicación actual
                    </span>
                  </button>

                  <div style={{ height: '300px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                    {(() => {
                      let lat = -17.7833;
                      let lng = -63.1821;
                      if (formData.gps) {
                        const parts = formData.gps.split(',');
                        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                          lat = parseFloat(parts[0]);
                          lng = parseFloat(parts[1]);
                        }
                      }
                      const position = formData.gps ? [lat, lng] : null;

                      return (
                        <MapContainer center={[lat, lng]} zoom={formData.gps ? 15 : 12} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <LocationPicker
                            position={position}
                            setPosition={(p) => setFormData(prev => ({ ...prev, gps: `${p[0]}, ${p[1]}` }))}
                          />
                        </MapContainer>
                      );
                    })()}
                  </div>
                  {formData.gps && (
                    <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--color-success, #10b981)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={14} /> Ubicación registrada ({formData.gps})
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--color-bg)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--color-border)' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    Imágenes y Videos
                  </label>

                  {existingMedia.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Archivos actuales:</p>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {existingMedia.map((media, i) => (
                          <div key={media.id} style={{ width: '100px', position: 'relative' }}>
                            {media.tipo === 'video' ? (
                              <video src={media.archivo} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                            ) : (
                              <img src={media.archivo} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border)' }} alt={`existing-${i}`} />
                            )}
                            {media.principal && (
                              <span style={{ position: 'absolute', bottom: '4px', left: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.65rem', textAlign: 'center', padding: '2px', borderRadius: '4px' }}>Principal</span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setMediaToDelete(prev => [...prev, media.id]);
                                setExistingMedia(prev => prev.filter(m => m.id !== media.id));
                              }}
                              style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--color-danger, #ef4444)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                              title="Eliminar archivo existente"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                    Sube {existingMedia.length > 0 ? 'más ' : ''}fotografías o videos de tu inmueble. La primera imagen será usada como la principal. Serán subidos a Cloudinary.
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    style={{ display: 'block', width: '100%', padding: '8px' }}
                  />
                  {previewUrls.length > 0 && (
                    <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {previewUrls.map((preview, i) => (
                        <div key={i} style={{ width: '100px', position: 'relative' }}>
                          {preview.type.startsWith('video/') ? (
                            <video src={preview.url} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                          ) : (
                            <img src={preview.url} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border)' }} alt={`prev-${i}`} />
                          )}
                          {i === 0 && (
                            <span style={{ position: 'absolute', bottom: '4px', left: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.65rem', textAlign: 'center', padding: '2px', borderRadius: '4px' }}>Principal</span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--color-danger, #ef4444)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--color-bg)' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', color: 'var(--color-text-secondary)', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                form="inmuebleForm"
                type="submit"
                disabled={saving}
                style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Guardando...' : (editingId ? 'Actualizar Inmueble' : 'Guardar Inmueble')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showHorarioModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', zIndex: 1001,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '500px',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Horarios de visita</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Define cuándo pueden agendar visitas a este inmueble
                </p>
              </div>
              <button onClick={() => setShowHorarioModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>
                &times;
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {/* Formulario para agregar horario */}
              <div style={{
                background: '#f8fafc', borderRadius: '12px', padding: '16px',
                marginBottom: '20px', border: '1px solid #e2e8f0',
              }}>
                <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                  Agregar disponibilidad
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: '120px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>Día</label>
                    <select
                      value={nuevoHorario.dia_semana}
                      onChange={e => setNuevoHorario(p => ({ ...p, dia_semana: parseInt(e.target.value) }))}
                      className="propiedades-filter__select" style={{ width: '100%' }}
                    >
                      {DIAS_NOMBRES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: '100px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>Desde</label>
                    <input type="time" value={nuevoHorario.hora_inicio}
                      onChange={e => setNuevoHorario(p => ({ ...p, hora_inicio: e.target.value }))}
                      className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: '100px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '6px' }}>Hasta</label>
                    <input type="time" value={nuevoHorario.hora_fin}
                      onChange={e => setNuevoHorario(p => ({ ...p, hora_fin: e.target.value }))}
                      className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
                  <button onClick={agregarHorario} disabled={guardandoHorario}
                    style={{
                      background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '8px',
                      padding: '10px 16px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
                    }}>
                    {guardandoHorario ? '...' : '+ Agregar'}
                  </button>
                </div>
              </div>

              {/* Lista de horarios */}
              {horarios.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.9rem' }}>
                  No has definido horarios aún. Los clientes no podrán agendar visitas sin horarios.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {horarios.map(h => (
                    <div key={h.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          background: '#e0f2fe', color: '#0284c7',
                          padding: '4px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                        }}>
                          {DIAS_NOMBRES[h.dia_semana]}
                        </span>
                        <span style={{ color: '#334155', fontSize: '0.9rem', fontWeight: 500 }}>
                          {h.hora_inicio?.slice(0, 5)} — {h.hora_fin?.slice(0, 5)}
                        </span>
                      </div>
                      <button onClick={() => eliminarHorario(h.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              padding: '16px 24px', borderTop: '1px solid var(--color-border)',
              background: '#f8fafc', display: 'flex', justifyContent: 'flex-end',
            }}>
              <button onClick={() => setShowHorarioModal(false)}
                style={{
                  background: '#0ea5e9', color: '#fff', border: 'none',
                  padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                }}>
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
      {showPubModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1001,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '650px',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid var(--color-border)'
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={20} style={{ color: 'var(--color-primary)' }} />
                    Gestionar Ofertas Comerciales
                  </span>
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Administra las publicaciones, precios e historial de esta propiedad.
                </p>
              </div>
              <button onClick={() => setShowPubModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >&times;</button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Formulario para agregar publicación */}
              <form onSubmit={crearPublicacion} style={{
                background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', borderRadius: '16px', padding: '20px',
                border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', flexDirection: 'column', gap: '14px'
              }}>
                <p style={{ margin: '0', fontWeight: 700, color: '#065f46', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={16} /> Crear Nueva Oferta Comercial
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: '130px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#047857', marginBottom: '6px', fontWeight: 600 }}>Tipo de Oferta</label>
                    <select
                      value={newPubFormData.tipo_oferta}
                      onChange={e => setNewPubFormData(p => ({ ...p, tipo_oferta: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '10px',
                        border: '1px solid rgba(16, 185, 129, 0.3)', background: '#fff', fontSize: '0.9rem'
                      }}
                    >
                      <option value="alquiler">Alquiler</option>
                      <option value="venta">Venta</option>
                      <option value="anticretico">Anticrético</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: '130px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#047857', marginBottom: '6px', fontWeight: 600 }}>Precio (Bs)</label>
                    <input type="number" min="0" step="0.01" required value={newPubFormData.precio}
                      onChange={e => setNewPubFormData(p => ({ ...p, precio: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '10px',
                        border: '1px solid rgba(16, 185, 129, 0.3)', background: '#fff', fontSize: '0.9rem'
                      }}
                      placeholder="Ej. 3500" />
                  </div>
                  <div style={{ flex: 1, minWidth: '130px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#047857', marginBottom: '6px', fontWeight: 600 }}>Estado Inicial</label>
                    <select
                      value={newPubFormData.estado}
                      onChange={e => setNewPubFormData(p => ({ ...p, estado: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '10px',
                        border: '1px solid rgba(16, 185, 129, 0.3)', background: '#fff', fontSize: '0.9rem'
                      }}
                    >
                      <option value="activa">Activa (Publicada)</option>
                      <option value="borrador">Borrador</option>
                      <option value="pausada">Pausada</option>
                    </select>
                  </div>
                  <button type="submit" disabled={savingPub}
                    style={{
                      background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px',
                      padding: '10px 20px', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap',
                      boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)', transition: 'transform 0.1s',
                      display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px'
                    }}>
                    {savingPub ? '...' : '+ Publicar'}
                  </button>
                </div>
                {newPubFormData.estado === 'activa' && (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#047857', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.87 }}>
                    <AlertCircle size={12} /> Nota: Activar esta oferta finalizará automáticamente cualquier otra oferta activa existente.
                  </p>
                )}
              </form>

              {/* Lista de publicaciones */}
              <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                  Historial de Ofertas Comerciales
                </h3>
                {loadingPubs ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>Cargando ofertas...</div>
                ) : publications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.9rem', border: '1px dashed var(--color-border)', borderRadius: '12px' }}>
                    Esta propiedad no tiene ofertas registradas. Crea una arriba.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {publications.map(pub => {
                      const isActiva = pub.estado === 'activa';
                      const offerColors = {
                        alquiler: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', label: 'Alquiler', border: '1px solid rgba(16, 185, 129, 0.2)' },
                        venta: { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', label: 'Venta', border: '1px solid rgba(99, 102, 241, 0.2)' },
                        anticretico: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Anticrético', border: '1px solid rgba(245, 158, 11, 0.2)' },
                      };
                      const pubStyle = offerColors[pub.tipo_oferta] || { label: pub.tipo_oferta, color: '#475569', bg: '#f1f5f9', border: '1px solid #cbd5e1' };

                      return (
                        <div key={pub.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '16px', background: isActiva ? 'rgba(16, 185, 129, 0.03)' : '#f8fafc',
                          borderRadius: '14px', border: isActiva ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--color-border)',
                          transition: 'all 0.2s', boxShadow: isActiva ? '0 4px 6px -1px rgba(16, 185, 129, 0.05)' : 'none'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                                background: pubStyle.bg, color: pubStyle.color, border: pubStyle.border
                              }}>
                                {pubStyle.label}
                              </span>
                              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                                Bs. {parseFloat(pub.precio).toLocaleString()} {pub.tipo_oferta === 'alquiler' ? '/ mes' : pub.tipo_oferta === 'anticretico' ? '(Anticrético)' : ''}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> Creada el {new Date(pub.creado).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <select
                              value={pub.estado}
                              onChange={e => cambiarEstadoPublicacion(pub.id, e.target.value)}
                              style={{
                                padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--color-border)',
                                fontSize: '0.85rem', fontWeight: 600, background: isActiva ? '#dcfce7' : '#f1f5f9',
                                color: isActiva ? '#15803d' : '#475569', cursor: 'pointer'
                              }}
                            >
                              <option value="borrador">Borrador</option>
                              <option value="activa">Activa</option>
                              <option value="pausada">Pausada</option>
                              <option value="finalizada">Finalizada</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{
              padding: '16px 24px', borderTop: '1px solid var(--color-border)',
              background: '#f8fafc', display: 'flex', justifyContent: 'flex-end',
            }}>
              <button onClick={() => setShowPubModal(false)}
                style={{
                  background: 'var(--color-primary)', color: '#fff', border: 'none',
                  padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                }}>
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MisInmuebles;
