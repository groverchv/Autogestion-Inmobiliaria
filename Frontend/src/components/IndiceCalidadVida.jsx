import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  ShoppingBag, 
  Activity, 
  GraduationCap, 
  Trees, 
  Bus, 
  Footprints, 
  Layers, 
  ChevronRight, 
  Sparkles, 
  Navigation,
  Info
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import './IndiceCalidadVida.css';

// Fix para íconos estándar de Leaflet en Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Icono personalizado para el inmueble principal
const propertyIcon = new L.DivIcon({
  className: 'custom-property-pin',
  html: `<div class="property-pin-inner">
           <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
             <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
             <polyline points="9 22 9 12 15 12 15 22"/>
           </svg>
         </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

// Iconos por categoría para POIs
const createCategoryIcon = (color, svgPath) => {
  return new L.DivIcon({
    className: 'custom-poi-pin',
    html: `<div class="poi-pin-inner" style="background-color: ${color};">
             ${svgPath}
           </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
};

const CATEGORIA_ICONS = {
  supermercados: createCategoryIcon('#10b981', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'),
  salud: createCategoryIcon('#ef4444', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>'),
  educacion: createCategoryIcon('#38bdf8', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>'),
  recreacion: createCategoryIcon('#14b8a6', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/></svg>'),
  transporte: createCategoryIcon('#f59e0b', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5c-.3-1-1.1-1.8-2.1-1.8H4.7c-1 0-1.8.8-2.1 1.8l-1.4 5c-.1.4-.2.8-.2 1.2 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>')
};

const IndiceCalidadVida = ({ inmuebleId, gps = null, direccion = '' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [mostrarRadios, setMostrarRadios] = useState(true);

  // Formatear dirección si viene como objeto {calle, zona, ciudad}
  const direccionStr = typeof direccion === 'object' && direccion !== null
    ? `${direccion.calle || ''} ${direccion.zona ? `- ${direccion.zona}` : ''} ${direccion.ciudad ? `(${direccion.ciudad})` : ''}`.trim()
    : String(direccion || '');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    let lat = -17.7833;
    let lng = -63.1821;

    if (gps && gps.includes(',')) {
      const parts = gps.split(',');
      const parsedLat = parseFloat(parts[0].trim());
      const parsedLng = parseFloat(parts[1].trim());
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        lat = parsedLat;
        lng = parsedLng;
      }
    }

    api.get('/inmuebles/calidad-vida/evaluar/', {
      params: { inmueble: inmuebleId, lat, lng }
    })
      .then(res => {
        if (active) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          console.error("Error al obtener índice de calidad de vida:", err);
          setError("No se pudo calcular el índice de calidad de vida.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [inmuebleId, gps]);

  if (loading) {
    return (
      <div className="calidad-vida-card calidad-vida-loading">
        <div className="calidad-vida-spinner"></div>
        <p>Analizando entorno urbano, conectividad y servicios a pie...</p>
      </div>
    );
  }

  if (error || !data) {
    return null; // Omitir elegantemente si no se puede cargar
  }

  const { walk_score, clasificacion, descripcion, color, coordenadas_centro, desglose_categorias, puntos_de_interes } = data;
  const lat = coordenadas_centro?.lat || -17.7833;
  const lng = coordenadas_centro?.lng || -63.1821;

  const poisFiltrados = categoriaFiltro === 'todas'
    ? puntos_de_interes
    : puntos_de_interes.filter(p => p.categoria === categoriaFiltro);

  return (
    <div className="calidad-vida-card">
      {/* ─── Encabezado Principal ─── */}
      <div className="calidad-vida-header">
        <div className="calidad-vida-header-left">
          <div className="calidad-vida-icon-badge">
            <Footprints size={24} color="#0284c7" />
          </div>
          <div>
            <h2 className="calidad-vida-title">¿Qué hay cerca?</h2>
            <p className="calidad-vida-subtitle">
              Servicios, transporte y comercio a pie ({direccionStr || 'Zona Residencial'})
            </p>

          </div>
        </div>

        {/* Valoración del entorno */}
        <div className="walk-score-badge" style={{ borderColor: color }} title="Estimación referencial de qué tan fácil es vivir aquí a pie">
          <div className="walk-score-number" style={{ color: color }}>
            {walk_score}
            <span className="walk-score-max">/100</span>
          </div>
          <div className="walk-score-label">
            <span className="walk-score-status" style={{ backgroundColor: color }}>
              {clasificacion}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Descripción del Entorno ─── */}
      <div className="calidad-vida-desc-box">
        <Sparkles size={18} className="calidad-vida-desc-icon" />
        <p>{descripcion}</p>
      </div>

      {/* ─── Ponderación por Categorías (Barritas de Progreso) ─── */}
      <div className="calidad-vida-categories-grid">
        {desglose_categorias && Object.entries(desglose_categorias).map(([key, cat]) => {
          const pct = Math.round((cat.puntaje_obtenido / cat.peso_maximo) * 100);
          return (
            <div 
              key={key} 
              className={`cat-card ${categoriaFiltro === key ? 'cat-card--active' : ''}`}
              onClick={() => setCategoriaFiltro(categoriaFiltro === key ? 'todas' : key)}
            >
              <div className="cat-card-header">
                <span className="cat-card-name">{cat.nombre}</span>
                <span className="cat-card-dist">
                  {cat.mas_cercano ? `a ${cat.mas_cercano.distancia_metros}m (${cat.mas_cercano.minutos_a_pie} min)` : 'No detectado'}
                </span>
              </div>
              <div className="cat-progress-bg">
                <div 
                  className="cat-progress-bar" 
                  style={{ 
                    width: `${pct}%`,
                    backgroundColor: pct >= 80 ? '#10b981' : pct >= 50 ? '#0ea5e9' : '#f59e0b' 
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Filtros de POIs y Controles del Mapa ─── */}
      <div className="calidad-vida-controls">
        <div className="poi-filter-tabs">
          <button 
            className={`poi-tab ${categoriaFiltro === 'todas' ? 'poi-tab--active' : ''}`}
            onClick={() => setCategoriaFiltro('todas')}
          >
            Todos ({puntos_de_interes.length})
          </button>
          <button 
            className={`poi-tab ${categoriaFiltro === 'supermercados' ? 'poi-tab--active' : ''}`}
            onClick={() => setCategoriaFiltro('supermercados')}
          >
            <ShoppingBag size={14} /> Supermercados
          </button>
          <button 
            className={`poi-tab ${categoriaFiltro === 'salud' ? 'poi-tab--active' : ''}`}
            onClick={() => setCategoriaFiltro('salud')}
          >
            <Activity size={14} /> Salud
          </button>
          <button 
            className={`poi-tab ${categoriaFiltro === 'educacion' ? 'poi-tab--active' : ''}`}
            onClick={() => setCategoriaFiltro('educacion')}
          >
            <GraduationCap size={14} /> Educación
          </button>
          <button 
            className={`poi-tab ${categoriaFiltro === 'recreacion' ? 'poi-tab--active' : ''}`}
            onClick={() => setCategoriaFiltro('recreacion')}
          >
            <Trees size={14} /> Parques
          </button>
          <button 
            className={`poi-tab ${categoriaFiltro === 'transporte' ? 'poi-tab--active' : ''}`}
            onClick={() => setCategoriaFiltro('transporte')}
          >
            <Bus size={14} /> Transporte
          </button>
        </div>

        <button 
          className={`radios-toggle-btn ${mostrarRadios ? 'radios-toggle-btn--active' : ''}`}
          onClick={() => setMostrarRadios(!mostrarRadios)}
          title="Alternar círculos de tiempo a pie"
        >
          <Layers size={14} />
          <span>Isocronas a pie (5 y 10 min)</span>
        </button>
      </div>

      {/* ─── Mapa Interactivo Leaflet con Capas & Radios ─── */}
      <div className="calidad-vida-map-container">
        <MapContainer 
          center={[lat, lng]} 
          zoom={15} 
          scrollWheelZoom={false}
          className="calidad-vida-leaflet-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Marcador del Inmueble Principal */}
          <Marker position={[lat, lng]} icon={propertyIcon}>
            <Popup>
              <div className="map-popup-content">
                <strong>Inmueble Seleccionado</strong>
                <p>{direccionStr || 'Punto central de análisis'}</p>
              </div>

            </Popup>
          </Marker>

          {/* Círculos de Radio de Caminata (5 min = 400m, 10 min = 800m) */}
          {mostrarRadios && (
            <>
              <Circle
                center={[lat, lng]}
                radius={400}
                pathOptions={{
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.08,
                  weight: 1.5,
                  dashArray: '4, 6'
                }}
              />
              <Circle
                center={[lat, lng]}
                radius={800}
                pathOptions={{
                  color: '#38bdf8',
                  fillColor: '#0284c7',
                  fillOpacity: 0.04,
                  weight: 1.5,
                  dashArray: '4, 6'
                }}
              />
            </>
          )}

          {/* Marcadores de Servicios (POIs) */}
          {poisFiltrados.map((poi, idx) => {
            const icon = CATEGORIA_ICONS[poi.categoria] || propertyIcon;
            return (
              <Marker 
                key={idx} 
                position={[poi.lat, poi.lng]} 
                icon={icon}
              >
                <Popup>
                  <div className="map-popup-content">
                    <span className="popup-category">{poi.tipo}</span>
                    <strong className="popup-title">{poi.nombre}</strong>
                    <div className="popup-meta">
                      <span><Navigation size={12} /> {poi.distancia_metros} m</span>
                      <span><Footprints size={12} /> ~{poi.minutos_a_pie} min a pie</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* ─── Lista Desglosada de Lugares Cercanos ─── */}
      <div className="poi-list-section">
        <h4 className="poi-list-title">
          Lugares y Servicios Destacados en el Barrio ({poisFiltrados.length})
        </h4>
        <div className="poi-cards-grid">
          {poisFiltrados.slice(0, 6).map((poi, idx) => (
            <div key={idx} className="poi-item-card">
              <div className="poi-item-icon">
                {poi.categoria === 'supermercados' && <ShoppingBag size={18} color="#10b981" />}
                {poi.categoria === 'salud' && <Activity size={18} color="#ef4444" />}
                {poi.categoria === 'educacion' && <GraduationCap size={18} color="#38bdf8" />}
                {poi.categoria === 'recreacion' && <Trees size={18} color="#14b8a6" />}
                {poi.categoria === 'transporte' && <Bus size={18} color="#f59e0b" />}
              </div>
              <div className="poi-item-info">
                <span className="poi-item-name">{poi.nombre}</span>
                <span className="poi-item-type">{poi.tipo}</span>
              </div>
              <div className="poi-item-distance">
                <span className="poi-dist-m">{poi.distancia_metros} m</span>
                <span className="poi-dist-time">{poi.minutos_a_pie} min a pie</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IndiceCalidadVida;
