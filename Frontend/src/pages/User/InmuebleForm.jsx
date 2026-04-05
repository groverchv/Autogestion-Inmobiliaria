import { useState, useEffect, useRef, useCallback } from 'react';

import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import inmuebleService from '../../services/inmuebleService';
import Button from '../../components/Button';
import './Inmuebles.css';

// ─── Fix Leaflet default marker icon ────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Datos de ciudades y zonas de Bolivia ───────────────────
const CIUDADES_ZONAS = {
  'La Paz': [
    'Zona Sur', 'Zona Central', 'Sopocachi', 'Miraflores', 'San Pedro',
    'Obrajes', 'Calacoto', 'Achumani', 'Irpavi', 'Cota Cota',
    'Seguencoma', 'Mallasa', 'San Miguel', 'Alto Seguencoma', 'Bella Vista',
    'Villa Fátima', 'Villa Copacabana', 'Tembladerani', 'Pura Pura', 'Otro',
  ],
  'El Alto': [
    'Ciudad Satélite', 'Villa Adela', 'Río Seco', '16 de Julio',
    'Villa Bolívar', 'Santiago II', 'Plan 3000', 'Otro',
  ],
  'Cochabamba': [
    'Zona Norte', 'Zona Sur', 'Zona Central', 'Cala Cala', 'Queru Queru',
    'Temporal', 'Sarco', 'Tupuraya', 'Hipódromo', 'La Recoleta',
    'Tiquipaya', 'Colcapirhua', 'Sacaba', 'Otro',
  ],
  'Santa Cruz': [
    'Centro', 'Equipetrol', 'Urbarí', 'Las Palmas', 'Plan 3000',
    'Radial 13', 'Radial 17', 'Radial 26', 'Norte Integrado',
    'Hamacas', 'Sirari', 'Los Mangales', 'Otro',
  ],
  'Sucre': [
    'Centro Histórico', 'Zona Norte', 'Zona Sur', 'La Recoleta',
    'Lajastambo', 'Alto Delicias', 'Otro',
  ],
  'Tarija': [
    'Centro', 'El Molino', 'Tabladita', 'San Gerónimo',
    'Morros Blancos', 'Juan XXIII', 'Otro',
  ],
  'Oruro': [
    'Centro', 'Zona Norte', 'Zona Sur', 'Ciudad Universitaria',
    'Vinto', 'Otro',
  ],
  'Potosí': [
    'Centro', 'Zona Norte', 'Zona Sur', 'San Cristóbal', 'Otro',
  ],
  'Trinidad': [
    'Centro', 'Zona Norte', 'Pompeya', 'Otro',
  ],
  'Cobija': [
    'Centro', 'Zona Sur', 'Otro',
  ],
};

// ─── Coordenadas iniciales por ciudad ───────────────────────
const CITY_COORDS = {
  'La Paz':      { lat: -16.4897, lng: -68.1193 },
  'El Alto':     { lat: -16.5100, lng: -68.1632 },
  'Cochabamba':  { lat: -17.3895, lng: -66.1568 },
  'Santa Cruz':  { lat: -17.7833, lng: -63.1821 },
  'Sucre':       { lat: -19.0352, lng: -65.2591 },
  'Tarija':      { lat: -21.5355, lng: -64.7296 },
  'Oruro':       { lat: -17.9624, lng: -67.1064 },
  'Potosí':      { lat: -19.5836, lng: -65.7531 },
  'Trinidad':    { lat: -14.8333, lng: -64.9000 },
  'Cobija':      { lat: -11.0267, lng: -68.7633 },
};

const DEFAULT_CENTER = { lat: -16.4897, lng: -68.1193 };

// ─── Componente selector de mapa ────────────────────────────
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

/**
 * Formulario profesional para Crear/Editar inmuebles.
 * Incluye selectores de ciudad/zona, mapa interactivo Leaflet, y formulario step-based.
 */
const InmuebleForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const mapRef = useRef(null);

  // ─── Estado del formulario ─────────────────────────────────
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    tipo: '',
    direccion: '',
    ciudad: '',
    zona: '',
    precio: '',
    superficie: '',
    habitaciones: 0,
    banos: 0,
    garaje: false,
    estado: 'disponible',
    latitud: '',
    longitud: '',
  });

  const [tipos, setTipos] = useState([]);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});

  const zonas = formData.ciudad ? (CIUDADES_ZONAS[formData.ciudad] || []) : [];

  // ─── Steps para el formulario ──────────────────────────────
  const steps = [
    { id: 'general', label: 'General', icon: '📋' },
    { id: 'ubicacion', label: 'Ubicación', icon: '📍' },
    { id: 'detalles', label: 'Detalles', icon: '🏗️' },
    { id: 'multimedia', label: 'Imágenes', icon: '📸' },
  ];

  // ─── Carga inicial ────────────────────────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const tiposData = await inmuebleService.getTipos();
        setTipos(Array.isArray(tiposData) ? tiposData : tiposData.results || []);

        if (isEditing) {
          const inmueble = await inmuebleService.getById(id);
          setFormData({
            titulo: inmueble.titulo || '',
            descripcion: inmueble.descripcion || '',
            tipo: inmueble.tipo || '',
            direccion: inmueble.direccion || '',
            ciudad: inmueble.ciudad || '',
            zona: inmueble.zona || '',
            precio: inmueble.precio || '',
            superficie: inmueble.superficie || '',
            habitaciones: inmueble.habitaciones ?? 0,
            banos: inmueble.banos ?? 0,
            garaje: inmueble.garaje ?? false,
            estado: inmueble.estado || 'disponible',
            latitud: inmueble.latitud || '',
            longitud: inmueble.longitud || '',
          });
        }
      } catch {
        setError('No se pudieron cargar los datos. Intenta de nuevo.');
      } finally {
        setLoadingData(false);
      }
    };

    loadInitialData();
  }, [id, isEditing]);

  // ─── Flyto new city on select ─────────────────────────────
  useEffect(() => {
    if (formData.ciudad && mapRef.current && activeStep === 1) {
      const coords = CITY_COORDS[formData.ciudad];
      if (coords) {
        // Delay flyTo so the map container has proper dimensions after becoming visible
        setTimeout(() => {
          if (mapRef.current) {
            try {
              mapRef.current.invalidateSize();
              mapRef.current.flyTo([coords.lat, coords.lng], 13, { duration: 1 });
            } catch {
              // Fallback: setView without animation
              mapRef.current.setView([coords.lat, coords.lng], 13);
            }
          }
        }, 100);
      }
    }
  }, [formData.ciudad, activeStep]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCiudadChange = (e) => {
    const ciudad = e.target.value;
    setFormData((prev) => ({ ...prev, ciudad, zona: '' }));

    // Auto-set lat/lng to city center
    const coords = CITY_COORDS[ciudad];
    if (coords) {
      setFormData((prev) => ({
        ...prev,
        ciudad,
        zona: '',
        latitud: coords.lat.toFixed(7),
        longitud: coords.lng.toFixed(7),
      }));
    }
  };

  const handleMapClick = useCallback((lat, lng) => {
    setFormData((prev) => ({
      ...prev,
      latitud: lat.toFixed(7),
      longitud: lng.toFixed(7),
    }));
  }, []);

  const handleFilesChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles]);
    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveFile = (index) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('inmueble-form__upload-area--dragover');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('inmueble-form__upload-area--dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('inmueble-form__upload-area--dragover');
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (droppedFiles.length > 0) {
      setFiles((prev) => [...prev, ...droppedFiles]);
      const newPreviews = droppedFiles.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // ── Manual validation ──
    const errors = {};
    if (!formData.titulo.trim()) errors.titulo = 'El título es obligatorio';
    if (!formData.tipo) errors.tipo = 'Selecciona un tipo de inmueble';
    if (!formData.ciudad) errors.ciudad = 'Selecciona una ciudad';
    if (!formData.zona) errors.zona = 'Selecciona una zona';
    if (!formData.direccion.trim()) errors.direccion = 'La dirección es obligatoria';
    if (!formData.precio || Number(formData.precio) <= 0) errors.precio = 'Ingresa un precio válido';

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      // Jump to the first step that has errors
      if (errors.titulo || errors.tipo) setActiveStep(0);
      else if (errors.ciudad || errors.zona || errors.direccion) setActiveStep(1);
      else if (errors.precio) setActiveStep(2);
      setError('Por favor completa todos los campos obligatorios.');
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setValidationErrors({});

    try {
      const payload = {
        ...formData,
        tipo: formData.tipo || null,
        precio: formData.precio || 0,
        superficie: formData.superficie || null,
        habitaciones: Number(formData.habitaciones),
        banos: Number(formData.banos),
        latitud: formData.latitud || null,
        longitud: formData.longitud || null,
      };

      let savedInmueble;

      if (isEditing) {
        savedInmueble = await inmuebleService.update(id, payload);
        setSuccess('¡Inmueble actualizado correctamente!');
      } else {
        savedInmueble = await inmuebleService.create(payload);
        setSuccess('¡Inmueble publicado exitosamente!');
      }

      if (files.length > 0 && savedInmueble?.id) {
        for (let i = 0; i < files.length; i++) {
          const fd = new FormData();
          fd.append('archivo', files[i]);
          fd.append('inmueble', savedInmueble.id);
          fd.append('tipo', 'imagen');
          fd.append('es_principal', i === 0 && !isEditing ? 'true' : 'false');
          await inmuebleService.uploadMultimedia(savedInmueble.id, fd);
        }
      }

      setTimeout(() => navigate('/user/inmuebles'), 1200);
    } catch (err) {
      const serverErrors = err.response?.data;
      if (serverErrors && typeof serverErrors === 'object') {
        const messages = Object.entries(serverErrors)
          .map(([field, msgs]) => {
            const msgText = Array.isArray(msgs) ? msgs.join(', ') : msgs;
            return `${field}: ${msgText}`;
          })
          .join(' | ');
        setError(messages);
      } else {
        setError('Ocurrió un error al guardar. Intenta de nuevo.');
      }
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Map center ────────────────────────────────────────────
  const mapCenter = formData.latitud && formData.longitud
    ? [parseFloat(formData.latitud), parseFloat(formData.longitud)]
    : formData.ciudad && CITY_COORDS[formData.ciudad]
      ? [CITY_COORDS[formData.ciudad].lat, CITY_COORDS[formData.ciudad].lng]
      : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

  const hasMarker = formData.latitud && formData.longitud;

  // ─── Loading ──────────────────────────────────────────────
  if (loadingData) {
    return (
      <div className="inmuebles-page__loading">
        <div className="inmuebles-page__loading-spinner" />
        <p>Cargando formulario...</p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="inmueble-form-page" id="inmueble-form-page">
      {/* Header */}
      <div className="inmueble-form-page__header">
        <button
          type="button"
          className="inmueble-form-page__back"
          onClick={() => navigate('/user/inmuebles')}
        >
          ← Volver
        </button>
        <h1 className="inmueble-form-page__title">
          {isEditing ? '✏️ Editar Inmueble' : '🏠 Publicar Inmueble'}
        </h1>
        <p className="inmueble-form-page__subtitle">
          {isEditing
            ? 'Modifica los datos de tu propiedad'
            : 'Completa los pasos para publicar una nueva propiedad'}
        </p>
      </div>

      {/* Alertas */}
      {error && (
        <div className="inmueble-form__alert inmueble-form__alert--error" role="alert">
          <span className="inmueble-form__alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="inmueble-form__alert inmueble-form__alert--success" role="status">
          <span className="inmueble-form__alert-icon">✅</span>
          <span>{success}</span>
        </div>
      )}

      {/* Step indicator */}
      <div className="inmueble-form__steps">
        {steps.map((step, idx) => (
          <button
            key={step.id}
            type="button"
            className={`inmueble-form__step ${idx === activeStep ? 'inmueble-form__step--active' : ''} ${idx < activeStep ? 'inmueble-form__step--done' : ''}`}
            onClick={() => setActiveStep(idx)}
          >
            <span className="inmueble-form__step-icon">{idx < activeStep ? '✓' : step.icon}</span>
            <span className="inmueble-form__step-label">{step.label}</span>
          </button>
        ))}
      </div>

      <form className="inmueble-form" onSubmit={handleSubmit} noValidate>
        {/* ═══════════ STEP 0: Información General ═══════════ */}
        <div className={`inmueble-form__section ${activeStep === 0 ? '' : 'inmueble-form__section--hidden'}`}>
          <h2 className="inmueble-form__section-title">📋 Información General</h2>
          <div className="inmueble-form__grid">
            <div className="inmueble-form__field inmueble-form__field--full">
              <label className="inmueble-form__label inmueble-form__label--required" htmlFor="titulo">
                Título de la publicación
              </label>
              <input
                className={`inmueble-form__input ${validationErrors.titulo ? 'inmueble-form__input--error' : ''}`}
                id="titulo"
                name="titulo"
                type="text"
                value={formData.titulo}
                onChange={handleChange}
                placeholder="Ej: Hermosa Casa con Jardín en Zona Sur"
              />
              {validationErrors.titulo
                ? <span className="inmueble-form__field-error">{validationErrors.titulo}</span>
                : <span className="inmueble-form__hint">Un título descriptivo atrae más interesados</span>
              }
            </div>

            <div className="inmueble-form__field">
              <label className="inmueble-form__label inmueble-form__label--required" htmlFor="tipo">
                Tipo de Inmueble
              </label>
              <select
                className={`inmueble-form__select ${validationErrors.tipo ? 'inmueble-form__input--error' : ''}`}
                id="tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
              >
                <option value="">— Seleccionar tipo —</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
              {validationErrors.tipo && <span className="inmueble-form__field-error">{validationErrors.tipo}</span>}
            </div>

            <div className="inmueble-form__field">
              <label className="inmueble-form__label" htmlFor="estado">
                Estado actual
              </label>
              <select
                className="inmueble-form__select"
                id="estado"
                name="estado"
                value={formData.estado}
                onChange={handleChange}
              >
                <option value="disponible">🟢 Disponible</option>
                <option value="ocupado">🔴 Ocupado</option>
                <option value="mantenimiento">🟡 En Mantenimiento</option>
                <option value="reservado">🔵 Reservado</option>
              </select>
            </div>

            <div className="inmueble-form__field inmueble-form__field--full">
              <label className="inmueble-form__label" htmlFor="descripcion">
                Descripción
              </label>
              <textarea
                className="inmueble-form__textarea"
                id="descripcion"
                name="descripcion"
                rows={5}
                value={formData.descripcion}
                onChange={handleChange}
                placeholder="Describe las características principales: acabados, ambientes, servicios cercanos, etc."
              />
              <span className="inmueble-form__hint">{formData.descripcion.length}/1000 caracteres</span>
            </div>
          </div>

          <div className="inmueble-form__step-nav">
            <div />
            <Button variant="primary" type="button" onClick={() => setActiveStep(1)}>
              Siguiente: Ubicación →
            </Button>
          </div>
        </div>

        {/* ═══════════ STEP 1: Ubicación ═══════════ */}
        <div className={`inmueble-form__section ${activeStep === 1 ? '' : 'inmueble-form__section--hidden'}`}>
          <h2 className="inmueble-form__section-title">📍 Ubicación del Inmueble</h2>

          <div className="inmueble-form__grid">
            <div className="inmueble-form__field">
              <label className="inmueble-form__label inmueble-form__label--required" htmlFor="ciudad">
                Ciudad
              </label>
              <select
                className={`inmueble-form__select ${validationErrors.ciudad ? 'inmueble-form__input--error' : ''}`}
                id="ciudad"
                name="ciudad"
                value={formData.ciudad}
                onChange={handleCiudadChange}
              >
                <option value="">— Seleccionar ciudad —</option>
                {Object.keys(CIUDADES_ZONAS).map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {validationErrors.ciudad && <span className="inmueble-form__field-error">{validationErrors.ciudad}</span>}
            </div>

            <div className="inmueble-form__field">
              <label className="inmueble-form__label inmueble-form__label--required" htmlFor="zona">
                Zona / Barrio
              </label>
              <select
                className={`inmueble-form__select ${validationErrors.zona ? 'inmueble-form__input--error' : ''}`}
                id="zona"
                name="zona"
                value={formData.zona}
                onChange={handleChange}
                disabled={!formData.ciudad}
              >
                <option value="">{formData.ciudad ? '— Seleccionar zona —' : 'Primero selecciona una ciudad'}</option>
                {zonas.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              {validationErrors.zona && <span className="inmueble-form__field-error">{validationErrors.zona}</span>}
            </div>

            <div className="inmueble-form__field inmueble-form__field--full">
              <label className="inmueble-form__label inmueble-form__label--required" htmlFor="direccion">
                Dirección exacta
              </label>
              <input
                className={`inmueble-form__input ${validationErrors.direccion ? 'inmueble-form__input--error' : ''}`}
                id="direccion"
                name="direccion"
                type="text"
                value={formData.direccion}
                onChange={handleChange}
                placeholder="Ej: Av. Ballivián #1234, entre calles 14 y 15"
              />
              {validationErrors.direccion
                ? <span className="inmueble-form__field-error">{validationErrors.direccion}</span>
                : <span className="inmueble-form__hint">Incluye avenida, calle, número y referencias</span>
              }
            </div>
          </div>

          {/* Mapa interactivo */}
          <div className="inmueble-form__map-wrapper">
            <label className="inmueble-form__label">
              📌 Marca la ubicación exacta en el mapa
            </label>
            <p className="inmueble-form__hint" style={{ marginBottom: 'var(--spacing-sm)' }}>
              Haz clic en el mapa para colocar el marcador. {formData.ciudad ? `Mostrando: ${formData.ciudad}` : 'Selecciona una ciudad primero.'}
            </p>
            <div className="inmueble-form__map-container">
              <MapContainer
                center={mapCenter}
                zoom={formData.ciudad ? 13 : 6}
                className="inmueble-form__map"
                ref={mapRef}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onLocationSelect={handleMapClick} />
                {hasMarker && (
                  <Marker position={[parseFloat(formData.latitud), parseFloat(formData.longitud)]} />
                )}
              </MapContainer>
            </div>

            {hasMarker && (
              <div className="inmueble-form__coords">
                <span className="inmueble-form__coord-badge">
                  📍 Lat: {parseFloat(formData.latitud).toFixed(5)}, Lng: {parseFloat(formData.longitud).toFixed(5)}
                </span>
              </div>
            )}
          </div>

          <div className="inmueble-form__step-nav">
            <Button variant="secondary" type="button" onClick={() => setActiveStep(0)}>
              ← General
            </Button>
            <Button variant="primary" type="button" onClick={() => setActiveStep(2)}>
              Siguiente: Detalles →
            </Button>
          </div>
        </div>

        {/* ═══════════ STEP 2: Características ═══════════ */}
        <div className={`inmueble-form__section ${activeStep === 2 ? '' : 'inmueble-form__section--hidden'}`}>
          <h2 className="inmueble-form__section-title">🏗️ Características del Inmueble</h2>
          <div className="inmueble-form__grid">
            <div className="inmueble-form__field">
              <label className="inmueble-form__label inmueble-form__label--required" htmlFor="precio">
                Precio (Bs)
              </label>
              <div className="inmueble-form__input-group">
                <span className="inmueble-form__input-prefix">Bs</span>
                <input
                  className={`inmueble-form__input inmueble-form__input--prefixed ${validationErrors.precio ? 'inmueble-form__input--error' : ''}`}
                  id="precio"
                  name="precio"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.precio}
                  onChange={handleChange}
                  placeholder="150000.00"
                />
              </div>
              {validationErrors.precio && <span className="inmueble-form__field-error">{validationErrors.precio}</span>}
            </div>

            <div className="inmueble-form__field">
              <label className="inmueble-form__label" htmlFor="superficie">
                Superficie
              </label>
              <div className="inmueble-form__input-group">
                <input
                  className="inmueble-form__input inmueble-form__input--suffixed"
                  id="superficie"
                  name="superficie"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.superficie}
                  onChange={handleChange}
                  placeholder="250"
                />
                <span className="inmueble-form__input-suffix">m²</span>
              </div>
            </div>
          </div>

          {/* Feature counter cards */}
          <div className="inmueble-form__counters">
            <div className="inmueble-form__counter">
              <span className="inmueble-form__counter-icon">🛏️</span>
              <span className="inmueble-form__counter-label">Habitaciones</span>
              <div className="inmueble-form__counter-controls">
                <button
                  type="button"
                  className="inmueble-form__counter-btn"
                  onClick={() => setFormData((p) => ({ ...p, habitaciones: Math.max(0, p.habitaciones - 1) }))}
                >−</button>
                <span className="inmueble-form__counter-value">{formData.habitaciones}</span>
                <button
                  type="button"
                  className="inmueble-form__counter-btn"
                  onClick={() => setFormData((p) => ({ ...p, habitaciones: p.habitaciones + 1 }))}
                >+</button>
              </div>
            </div>

            <div className="inmueble-form__counter">
              <span className="inmueble-form__counter-icon">🚿</span>
              <span className="inmueble-form__counter-label">Baños</span>
              <div className="inmueble-form__counter-controls">
                <button
                  type="button"
                  className="inmueble-form__counter-btn"
                  onClick={() => setFormData((p) => ({ ...p, banos: Math.max(0, p.banos - 1) }))}
                >−</button>
                <span className="inmueble-form__counter-value">{formData.banos}</span>
                <button
                  type="button"
                  className="inmueble-form__counter-btn"
                  onClick={() => setFormData((p) => ({ ...p, banos: p.banos + 1 }))}
                >+</button>
              </div>
            </div>

            <div className="inmueble-form__counter">
              <span className="inmueble-form__counter-icon">🚗</span>
              <span className="inmueble-form__counter-label">Garaje</span>
              <button
                type="button"
                className={`inmueble-form__toggle ${formData.garaje ? 'inmueble-form__toggle--on' : ''}`}
                onClick={() => setFormData((p) => ({ ...p, garaje: !p.garaje }))}
              >
                <span className="inmueble-form__toggle-thumb" />
                <span className="inmueble-form__toggle-text">{formData.garaje ? 'Sí' : 'No'}</span>
              </button>
            </div>
          </div>

          <div className="inmueble-form__step-nav">
            <Button variant="secondary" type="button" onClick={() => setActiveStep(1)}>
              ← Ubicación
            </Button>
            <Button variant="primary" type="button" onClick={() => setActiveStep(3)}>
              Siguiente: Imágenes →
            </Button>
          </div>
        </div>

        {/* ═══════════ STEP 3: Multimedia ═══════════ */}
        <div className={`inmueble-form__section ${activeStep === 3 ? '' : 'inmueble-form__section--hidden'}`}>
          <h2 className="inmueble-form__section-title">📸 Galería de Imágenes</h2>

          <div
            className="inmueble-form__upload-area"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <label htmlFor="file-upload" className="inmueble-form__upload-label">
              <div className="inmueble-form__upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="inmueble-form__upload-text">
                <strong>Arrastra tus imágenes aquí</strong> o haz clic para seleccionar
              </p>
              <p className="inmueble-form__upload-hint">
                PNG, JPG hasta 10MB · La primera imagen será la portada
              </p>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {previews.length > 0 && (
            <div className="inmueble-form__previews">
              {previews.map((src, index) => (
                <div key={index} className={`inmueble-form__preview ${index === 0 ? 'inmueble-form__preview--main' : ''}`}>
                  <img src={src} alt={`Preview ${index + 1}`} />
                  {index === 0 && <span className="inmueble-form__preview-badge">Portada</span>}
                  <button
                    type="button"
                    className="inmueble-form__preview-remove"
                    onClick={() => handleRemoveFile(index)}
                    aria-label="Eliminar imagen"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Final submit */}
          <div className="inmueble-form__step-nav">
            <Button variant="secondary" type="button" onClick={() => setActiveStep(2)}>
              ← Detalles
            </Button>
            <Button variant="primary" type="submit" loading={loading} size="lg">
              {isEditing ? '💾 Guardar Cambios' : '🚀 Publicar Inmueble'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default InmuebleForm;
