import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Check, X, Clock, Trash2, ShieldCheck, ShieldAlert, FileText, UploadCloud, RefreshCw, Settings, ChevronDown, ChevronUp, Eye, EyeOff, Edit3 } from 'lucide-react';
import tituloService from '../../services/tituloService';
import BlockchainAuditTrail from '../../components/BlockchainAuditTrail';
import useAlertConfirm from '../../hooks/useAlertConfirm';
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
  const { showAlert, showConfirm, ModalComponent } = useAlertConfirm();

  const [inmuebles, setInmuebles] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState(null);
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
    precio: '',
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

  const [showVerificacionModal, setShowVerificacionModal] = useState(false);
  const [inmuebleVerificacionId, setInmuebleVerificacionId] = useState(null);
  const [verificacionLoading, setVerificacionLoading] = useState(false);
  const [verificacionData, setVerificacionData] = useState(null);
  const [archivoVerificacion, setArchivoVerificacion] = useState(null);
  const [verificando, setVerificando] = useState(false);

  const DIAS_NOMBRES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

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
      showAlert({
        title: 'Error de Horario',
        message: err.response?.data?.detail || 'No se pudo agregar el horario de visitas. Verifica los datos.',
        status: 'error'
      });
    } finally { setGuardandoHorario(false); }
  };

  const eliminarHorario = (horarioId) => {
    showConfirm({
      title: '¿Eliminar horario?',
      message: '¿Estás seguro de que deseas eliminar este horario de visitas?',
      status: 'warning',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await api.delete(`/inmuebles/horarios/${horarioId}/`);
          setHorarios(prev => prev.filter(h => h.id !== horarioId));
          showAlert({ title: '¡Horario eliminado!', message: 'El horario ha sido removido con éxito.', status: 'success' });
        } catch { 
          showAlert({ title: 'Error', message: 'No se pudo eliminar el horario.', status: 'error' });
        }
      }
    });
  };

  const abrirVerificacion = async (inmId) => {
    setInmuebleVerificacionId(inmId);
    setVerificacionLoading(true);
    setVerificacionData(null);
    setArchivoVerificacion(null);
    setShowVerificacionModal(true);
    try {
      const data = await tituloService.getResultado(inmId);
      setVerificacionData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setVerificacionLoading(false);
    }
  };

  const handleSubirTitulo = async (e) => {
    e.preventDefault();
    if (!archivoVerificacion) return;
    setVerificando(true);
    try {
      const data = await tituloService.subirTitulo(inmuebleVerificacionId, archivoVerificacion);
      setVerificacionData(data);
      showAlert({
        title: '¡Análisis legal completado!',
        message: 'El análisis legal inteligente con IA del título de propiedad finalizó con éxito y el activo se selló automáticamente en la Blockchain.',
        status: 'success'
      });
      fetchData();
    } catch (err) {
      console.error(err);
      showAlert({
        title: 'Error de verificación',
        message: err.response?.data?.error || 'No se pudo verificar el documento.',
        status: 'error'
      });
    } finally {
      setVerificando(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [inmRes, tipRes] = await Promise.all([
        api.get('/inmuebles/panel/lista/?personal=true'),
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
        precio: detailedInm.precio || '',
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
      showAlert({
        title: 'Error de Carga',
        message: 'No se pudieron obtener los detalles del inmueble seleccionado. Inténtalo de nuevo.',
        status: 'error'
      });
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
      if (payload.precio === '') payload.precio = null;

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
        ciudad: '', zona: '', calle: '', referencia: '', precio: '', largo: '', ancho: '', superficie: '',
        habitaciones: 0, banos: 0, garaje: false, estado: 'disponible',
        gps: ''
      });
      setArchivos([]);
      setPreviewUrls([]);
      fetchData(); // Recargar
      showAlert({
        title: editingId ? '¡Inmueble Actualizado!' : '¡Inmueble Registrado!',
        message: editingId ? 'Los datos de tu propiedad han sido modificados exitosamente.' : 'Tu nuevo inmueble ha sido registrado y publicado exitosamente en la plataforma.',
        status: 'success'
      });
    } catch (err) {
      console.error(err);
      showAlert({
        title: 'Error de registro',
        message: 'No se pudo guardar la información del inmueble.',
        status: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    showConfirm({
      title: '¿Eliminar Inmueble?',
      message: '¿Estás seguro de que deseas eliminar este inmueble? Esta acción borrará todas sus fotos y datos de forma permanente.',
      status: 'error',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await api.delete(`/inmuebles/panel/lista/${id}/`);
          fetchData();
          showAlert({
            title: '¡Inmueble Eliminado!',
            message: 'La propiedad ha sido eliminada del sistema con éxito.',
            status: 'success'
          });
        } catch (err) {
          console.error(err);
          showAlert({
            title: 'Error al eliminar',
            message: 'Hubo un problema al intentar eliminar el inmueble.',
            status: 'error'
          });
        }
      }
    });
  };

  const handleToggleVisibilidad = async (inm) => {
    try {
      const nuevoEstado = inm.estado === 'oculto' ? 'disponible' : 'oculto';
      await api.patch(`/inmuebles/panel/lista/${inm.id}/`, { estado: nuevoEstado });
      fetchData();
      showAlert({
        title: 'Estado Actualizado',
        message: nuevoEstado === 'oculto' ? 'El inmueble ha sido ocultado del catálogo público.' : 'El inmueble ahora es visible para todos en el catálogo.',
        status: 'success'
      });
    } catch (err) {
      console.error(err);
      showAlert({
        title: 'Error de cambio de estado',
        message: 'No se pudo cambiar la visibilidad del inmueble.',
        status: 'error'
      });
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
    <div className="propiedades-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', paddingTop: '20px' }}>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '1.8rem', color: 'var(--color-text)', margin: 0 }}>Mis Inmuebles</h1>
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  titulo: '', descripcion: '', tipo: tipos.length > 0 ? tipos[0].id : '',
                  ciudad: '', zona: '', calle: '', referencia: '', precio: '', largo: '', ancho: '', superficie: '',
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
                    <div className="propiedad-card__image" style={{ height: '200px', position: 'relative' }}>
                      {inm.imagen_principal ? (
                        <img src={inm.imagen_principal} alt={inm.titulo} />
                      ) : (
                        <div className="propiedad-card__placeholder">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        </div>
                      )}
                      <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 2 }}>
                        <span className="propiedad-card__badge" style={{ background: estadoStyle.bg, color: estadoStyle.color, position: 'static' }}>
                          {inm.estado}
                        </span>
                        {inm.verificacion_estado && (
                          <span 
                            className="propiedad-card__badge" 
                            style={{ 
                              background: inm.verificacion_estado === 'verificado' ? '#dcfce7' : 
                                          inm.verificacion_estado === 'observado' ? '#fef3c7' : '#fee2e2',
                              color: inm.verificacion_estado === 'verificado' ? '#15803d' : 
                                     inm.verificacion_estado === 'observado' ? '#d97706' : '#dc2626',
                              position: 'static',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 700
                            }}
                          >
                            {inm.verificacion_estado === 'verificado' ? '✓ Título Ok' : 
                             inm.verificacion_estado === 'observado' ? '⚠ Obs. Título' : '✗ Inválido'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="propiedad-card__body">
                      <h3 className="propiedad-card__title">{inm.titulo}</h3>
                      <p className="propiedad-card__location">{inm.ciudad}{inm.zona ? `, ${inm.zona}` : ''}</p>

                      <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                        {/* Precio en su propia línea, visible y sin colisionar */}
                        <div style={{ marginBottom: '12px' }}>
                          <span className="propiedad-card__price" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                            Bs. {parseFloat(inm.precio).toLocaleString()}
                          </span>
                        </div>

                        {/* Botones principales de la tarjeta */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <Link 
                            to={`/propiedades/${inm.id}`} 
                            className="propiedad-card__cta" 
                            style={{ flex: 1, textAlign: 'center', padding: '8px 12px', fontSize: '0.85rem' }}
                          >
                            Ver Detalles
                          </Link>
                          
                          <button
                            type="button"
                            className={`propiedad-card__admin-toggle ${expandedCardId === inm.id ? 'propiedad-card__admin-toggle--active' : ''}`}
                            onClick={() => setExpandedCardId(expandedCardId === inm.id ? null : inm.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              background: '#ffffff',
                              border: '1px solid var(--color-border)',
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              color: 'var(--color-text-secondary)',
                              cursor: 'pointer',
                              transition: 'all var(--transition-fast)'
                            }}
                          >
                            <Settings size={16} />
                            <span>Gestionar</span>
                            {expandedCardId === inm.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>

                        {/* PANEL DE DESGLOSE ADMINISTRATIVO (COLLAPSIBLE) */}
                        {expandedCardId === inm.id && (
                          <div className="propiedad-card__admin-pane" style={{
                            marginTop: '12px',
                            background: 'var(--color-bg-secondary)',
                            borderRadius: '8px',
                            padding: '12px',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            animation: 'slideDown var(--transition-fast) ease-out'
                          }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                              Acciones de Administración
                            </span>
                            
                            <button
                              type="button"
                              onClick={() => abrirVerificacion(inm.id)}
                              className="propiedad-card__admin-btn"
                              style={{
                                color: inm.verificacion_estado === 'verificado' ? '#10b981' : 
                                       inm.verificacion_estado === 'observado' ? '#eab308' :
                                       inm.verificacion_estado === 'rechazado' ? '#ef4444' : 'var(--color-text-secondary)'
                              }}
                            >
                              {inm.verificacion_estado === 'verificado' ? <ShieldCheck size={16} /> : <FileText size={16} />}
                              <span>Análisis Legal de Título (IA)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirHorarios(inm.id)}
                              className="propiedad-card__admin-btn"
                              style={{ color: '#0ea5e9' }}
                            >
                              <Clock size={16} />
                              <span>Gestionar Horarios de Visita</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEdit(inm)}
                              className="propiedad-card__admin-btn"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              <Edit3 size={16} />
                              <span>Editar Información Ficha</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleVisibilidad(inm)}
                              className="propiedad-card__admin-btn"
                              style={{ color: inm.estado === 'oculto' ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
                            >
                              {inm.estado === 'oculto' ? <Eye size={16} /> : <EyeOff size={16} />}
                              <span>{inm.estado === 'oculto' ? 'Publicar Inmueble' : 'Ocultar Inmueble'}</span>
                            </button>

                            <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }}></div>

                            <button
                              type="button"
                              onClick={() => handleDelete(inm.id)}
                              className="propiedad-card__admin-btn propiedad-card__admin-btn--danger"
                            >
                              <Trash2 size={16} />
                              <span>Eliminar Publicación</span>
                            </button>
                          </div>
                        )}
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
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Precio (Bs) *</label>
                    <input required type="number" min="0" step="0.01" name="precio" value={formData.precio} onChange={handleChange} className="propiedades-filter__input" style={{ width: '100%' }} />
                  </div>
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
                          () => showAlert({
                            title: 'Permiso Denegado',
                            message: 'No se pudo acceder a tu ubicación actual. Por favor, verifica los permisos en tu navegador.',
                            status: 'warning'
                          })
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
                {saving ? 'Guardando...' : (editingId ? 'Actualizar Inmueble' : 'Publicar Inmueble')}
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

      {showVerificacionModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', zIndex: 1002,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '600px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={22} style={{ color: 'var(--color-primary)' }} /> Verificación de Título con IA
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Análisis legal automático de escrituras y folios reales usando OCR y NLP (Llama 3)
                </p>
              </div>
              <button onClick={() => setShowVerificacionModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>
                &times;
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {verificacionLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '12px' }}>
                  <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Obteniendo estado de verificación...</p>
                </div>
              ) : verificando ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: '16px' }}>
                  <div className="spinner" style={{
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid var(--color-primary)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <style>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 600, color: '#1e293b', margin: 0 }}>Procesando documento...</p>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>Extrayendo texto con OCR y ejecutando análisis legal con IA. Esto puede tomar unos segundos.</p>
                  </div>
                </div>
              ) : (!verificacionData || verificacionData.estado === 'no_solicitado' || verificacionData.estado === 'error') ? (
                <form onSubmit={handleSubirTitulo} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {verificacionData?.estado === 'error' && (
                    <div style={{
                      background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
                      padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px'
                    }}>
                      <ShieldAlert size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: '#991b1b', fontSize: '0.9rem' }}>
                          Error al procesar el documento anterior
                        </p>
                        <p style={{ margin: '4px 0 0', color: '#b91c1c', fontSize: '0.82rem' }}>
                          {verificacionData.resumen_publico || 'No se pudo leer el documento. Sube un archivo PDF o imagen legible e inténtalo de nuevo.'}
                        </p>
                      </div>
                    </div>
                  )}
                  <div style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '30px 20px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    position: 'relative'
                  }}>
                    <input 
                      type="file" 
                      required 
                      accept="application/pdf,image/*"
                      onChange={(e) => setArchivoVerificacion(e.target.files[0])}
                      style={{
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        opacity: 0, cursor: 'pointer'
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <UploadCloud size={40} style={{ color: '#94a3b8' }} />
                      <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#475569' }}>
                        {archivoVerificacion ? archivoVerificacion.name : 'Arrastra o selecciona el documento del título'}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                        Formatos soportados: PDF, JPG, PNG (máx. 10MB)
                      </p>
                    </div>
                  </div>

                  <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '12px', border: '1px solid #bfdbfe' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.4 }}>
                      💡 <strong>Recomendación:</strong> Para obtener la mejor precisión, sube un documento escaneado con buena iluminación y resolución, de preferencia la matrícula computarizada (Folio Real) o testimonio notarial de propiedad.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!archivoVerificacion}
                    style={{
                      background: archivoVerificacion ? 'var(--color-primary)' : '#cbd5e1',
                      color: '#fff', border: 'none', padding: '12px', borderRadius: '8px',
                      fontWeight: 600, cursor: archivoVerificacion ? 'pointer' : 'not-allowed',
                      transition: 'background 0.2s'
                    }}
                  >
                    Iniciar Verificación Inteligente
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px', borderRadius: '12px',
                    background: verificacionData.estado === 'verificado' ? '#dcfce7' : 
                                verificacionData.estado === 'observado' ? '#fef3c7' : 
                                verificacionData.estado === 'rechazado' ? '#fee2e2' : '#f1f5f9',
                    border: '1px solid ' + (
                                verificacionData.estado === 'verificado' ? '#bbf7d0' : 
                                verificacionData.estado === 'observado' ? '#fef08a' : 
                                verificacionData.estado === 'rechazado' ? '#fecaca' : '#cbd5e1'
                             ),
                    color: verificacionData.estado === 'verificado' ? '#14532d' : 
                           verificacionData.estado === 'observado' ? '#713f12' : 
                           verificacionData.estado === 'rechazado' ? '#7f1d1d' : '#334155'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {verificacionData.estado === 'verificado' ? <ShieldCheck size={32} /> : <ShieldAlert size={32} />}
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                          {verificacionData.estado_display}
                        </h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                          Analizado el {new Date(verificacionData.creado).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {verificacionData.score_confianza !== null && (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>{verificacionData.score_confianza}</span>
                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>/100</span>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', tracking: '0.05em', fontWeight: 600 }}>Confianza</div>
                      </div>
                    )}
                  </div>

                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', borderLeft: '4px solid var(--color-primary)' }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem', color: '#475569', textTransform: 'uppercase' }}>Resumen de la IA</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', fontWeight: 500, fontStyle: 'italic' }}>
                      "{verificacionData.resumen_publico}"
                    </p>
                  </div>

                  {verificacionData.resultado_ia && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ margin: '0 0 4px', fontSize: '0.9rem', color: '#334155', fontWeight: 700 }}>Datos Registrales Detectados</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Tipo de Documento</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{verificacionData.resultado_ia.tipo_documento || 'No detectado'}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Matrícula Inmobiliaria</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{verificacionData.resultado_ia.matricula_inmobiliaria || 'No detectado'}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Propietario Registrado</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{verificacionData.resultado_ia.propietario_registrado || 'No detectado'}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Documento Identidad</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{verificacionData.resultado_ia.documento_identidad || 'No detectado'}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Superficie Registrada</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{verificacionData.resultado_ia.superficie_registrada_m2 ? `${verificacionData.resultado_ia.superficie_registrada_m2} m²` : 'No detectada'}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Ubicación Registrada</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                            {verificacionData.resultado_ia.municipio ? `${verificacionData.resultado_ia.municipio}, ` : ''}
                            {verificacionData.resultado_ia.departamento || ''}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <h5 style={{ margin: 0, fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>Gravámenes e Hipotecas</h5>
                        {(!verificacionData.resultado_ia.gravamenes || verificacionData.resultado_ia.gravamenes.length === 0) ? (
                          <div style={{ background: '#f0fdf4', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Check size={16} /> Libre de gravámenes. No se detectaron hipotecas ni cargas legales vigentes.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {verificacionData.resultado_ia.gravamenes.map((grav, i) => (
                              <div key={i} style={{ background: '#fffbeb', color: '#92400e', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #fef08a', display: 'flex', gap: '8px' }}>
                                <span style={{ fontWeight: 'bold' }}>•</span>
                                <span>{grav}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {verificacionData.resultado_ia.alertas && verificacionData.resultado_ia.alertas.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <h5 style={{ margin: 0, fontSize: '0.85rem', color: '#b91c1c', fontWeight: 700 }}>Observaciones / Irregularidades</h5>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {verificacionData.resultado_ia.alertas.map((alerta, i) => (
                              <div key={i} style={{ background: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid #fecaca', display: 'flex', gap: '8px' }}>
                                <span style={{ fontWeight: 'bold' }}>⚠</span>
                                <span>{alerta}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Trazabilidad inmutable en Blockchain */}
                  <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginBottom: '16px' }}>
                    <BlockchainAuditTrail assetId={`INM-${inmuebleVerificacionId}`} />
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <a href={verificacionData.archivo_titulo} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                      Ver documento original subido
                    </a>
                    <button
                      onClick={() => {
                        setVerificacionData(null);
                        setArchivoVerificacion(null);
                      }}
                      style={{
                        background: 'transparent', border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)', borderRadius: '8px', padding: '8px 16px',
                        fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Volver a Subir Documento
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={{
              padding: '16px 24px', borderTop: '1px solid var(--color-border)',
              background: '#f8fafc', display: 'flex', justifyContent: 'flex-end',
            }}>
              <button onClick={() => setShowVerificacionModal(false)}
                style={{
                  background: 'var(--color-primary)', color: '#fff', border: 'none',
                  padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {ModalComponent}
    </div>
  );
};

export default MisInmuebles;
