import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Maximize2, Layers, Compass } from 'lucide-react';
import 'pannellum/build/pannellum.css';
import 'pannellum';
import ModalRecorrido3D from './ModalRecorrido3D';
import './Visor360.css';
/**
 * Visor360 — Componente de exploración inmersiva con panoramas 360°.
 *
 * Soporta navegación de dos niveles:
 *   1. Selector de pisos (pills)
 *   2. Tabs de habitaciones dentro del piso seleccionado
 *
 * Convención del campo `descripcion` de Multimedia:
 *   "Piso N | Habitación"  →  ej: "Piso 1 | Sala", "Piso 2 | Dormitorio"
 *   Si no contiene "|", se asume "Piso 1 | {descripcion}"
 *
 * @param {{ panoramas: Array<{id: number, archivo: string, descripcion: string}> }} props
 */
const Visor360 = ({ panoramas = [], tituloPropiedad = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const viewerRef = useRef(null);
  const viewerInstanceRef = useRef(null);
  const [pisoActivo, setPisoActivo] = useState('');
  const [escenaActiva, setEscenaActiva] = useState(null);
  const [cargando, setCargando] = useState(true);

  // ─── Parsear y agrupar panoramas por piso ────────────────────────────
  const pisosParsed = useMemo(() => {
    /** @type {Map<string, Array<{id: number, archivo: string, habitacion: string}>>} */
    const mapa = new Map();

    panoramas.forEach((p) => {
      let piso = 'Piso 1';
      let habitacion = p.descripcion || 'Vista 360°';

      if (p.descripcion && p.descripcion.includes('|')) {
        const partes = p.descripcion.split('|');
        piso = partes[0].trim();
        habitacion = partes[1]?.trim() || 'Vista 360°';
      }

      if (!mapa.has(piso)) {
        mapa.set(piso, []);
      }
      mapa.get(piso).push({
        id: p.id,
        archivo: p.archivo,
        habitacion,
      });
    });

    return mapa;
  }, [panoramas]);

  const nombresPisos = useMemo(() => Array.from(pisosParsed.keys()).sort(), [pisosParsed]);
  const tieneMasDeUnPiso = nombresPisos.length > 1;

  const habitacionesDelPiso = useMemo(
    () => pisosParsed.get(pisoActivo) || [],
    [pisosParsed, pisoActivo]
  );

  // ─── Inicializar piso y escena por defecto ───────────────────────────
  useEffect(() => {
    if (nombresPisos.length > 0 && !pisoActivo) {
      setPisoActivo(nombresPisos[0]);
    }
  }, [nombresPisos, pisoActivo]);

  useEffect(() => {
    if (habitacionesDelPiso.length > 0) {
      setEscenaActiva(habitacionesDelPiso[0]);
    }
  }, [habitacionesDelPiso]);

  // ─── Referencia para el ObjectURL del Blob ───────────────────────────
  const objectUrlRef = useRef(null);

  // ─── Inicializar / Actualizar Pannellum ──────────────────────────────
  const inicializarVisor = useCallback(async () => {
    if (!escenaActiva || !viewerRef.current) return;

    setCargando(true);

    // Destruir instancia previa si existe
    if (viewerInstanceRef.current) {
      try {
        viewerInstanceRef.current.destroy();
      } catch {
        // Ignorar errores al destruir
      }
      viewerInstanceRef.current = null;
    }

    // Liberar ObjectURL previo
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    try {
      // 1. Descargar la imagen como Blob para evadir la caché restrictiva (CORS) de Chrome
      // Se fuerza 'reload' para ignorar respuestas de caché sin headers CORS
      const imageUrl = escenaActiva.archivo;
      let panoramaUrl = '';

      if (imageUrl) {
        try {
          const response = await fetch(imageUrl, {
            cache: 'reload',
            mode: 'cors'
          });
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          objectUrlRef.current = objectUrl;
          panoramaUrl = objectUrl;
        } catch (fetchError) {
          console.warn('Fallo el fetch con CORS estricto, intentando URL directa:', fetchError);
          // Fallback a la URL directa con timestamp si el fetch estricto falla (ej. problemas de red locales)
          panoramaUrl = `${imageUrl}?cb=${new Date().getTime()}`;
        }
      }

      // 4. Inicializar Visor
      // Pannellum se inyecta globalmente en window.pannellum
      if (!window.pannellum) {
        throw new Error('Pannellum no se inicializó correctamente en el objeto window');
      }
      
      if (!viewerRef.current) return;

      viewerInstanceRef.current = window.pannellum.viewer(viewerRef.current, {
        type: 'equirectangular',
        panorama: panoramaUrl,
        autoLoad: true,
        crossOrigin: 'anonymous',
        autoRotate: -2,
        autoRotateInactivityDelay: 3000,
        compass: false,
        showZoomCtrl: true,
        showFullscreenCtrl: false,
        mouseZoom: true,
        draggable: true,
        hfov: 110,
        minHfov: 50,
        maxHfov: 120,
        friction: 0.15,
        yaw: 0,
        pitch: 0,
      });

      viewerInstanceRef.current.on('load', () => {
        setCargando(false);
      });

      // Fallback timeout en caso de que el evento 'load' no se dispare
      setTimeout(() => setCargando(false), 4000);
    } catch (error) {
      console.error('Error inicializando Pannellum:', error);
      setCargando(false);
    }
  }, [escenaActiva]);

  useEffect(() => {
    inicializarVisor();

    return () => {
      if (viewerInstanceRef.current) {
        try {
          viewerInstanceRef.current.destroy();
        } catch {
          // Ignorar
        }
        viewerInstanceRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [inicializarVisor]);

  // ─── Handlers ────────────────────────────────────────────────────────
  const cambiarPiso = (nombrePiso) => {
    if (nombrePiso === pisoActivo) return;
    setPisoActivo(nombrePiso);
  };

  const cambiarEscena = (escena) => {
    if (escena.id === escenaActiva?.id) return;
    setEscenaActiva(escena);
  };

  const toggleFullscreen = () => {
    const wrapper = viewerRef.current?.parentElement;
    if (!wrapper) return;

    if (!document.fullscreenElement) {
      wrapper.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  };

  // ─── Sin panoramas: no renderizar ────────────────────────────────────
  if (panoramas.length === 0) return null;

  return (
    <div className="visor360">
      {/* Encabezado */}
      <div className="visor360__header">
        <div className="visor360__header-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h2>Recorrido Virtual 360°</h2>
          <p>Explora el inmueble arrastrando la imagen con el mouse o tocando la pantalla</p>
        </div>
        <button
          className="visor360__start-tour-btn"
          onClick={() => setIsModalOpen(true)}
          type="button"
        >
          <Compass size={16} className="visor360__start-tour-icon" />
          Iniciar recorrido virtual
        </button>
      </div>

      {isModalOpen && (
        <ModalRecorrido3D
          panoramas={panoramas}
          tituloPropiedad={tituloPropiedad}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Selector de pisos (solo si hay más de 1) */}
      {tieneMasDeUnPiso && (
        <div className="visor360__pisos">
          {nombresPisos.map((nombre) => (
            <button
              key={nombre}
              className={`visor360__piso-btn ${pisoActivo === nombre ? 'visor360__piso-btn--active' : ''}`}
              onClick={() => cambiarPiso(nombre)}
              type="button"
            >
              <Layers size={14} />
              {nombre}
            </button>
          ))}
        </div>
      )}

      {/* Tabs de habitaciones */}
      {habitacionesDelPiso.length > 1 && (
        <div className="visor360__tabs">
          {habitacionesDelPiso.map((esc) => (
            <button
              key={esc.id}
              className={`visor360__tab ${escenaActiva?.id === esc.id ? 'visor360__tab--active' : ''}`}
              onClick={() => cambiarEscena(esc)}
              type="button"
            >
              {esc.habitacion}
            </button>
          ))}
        </div>
      )}

      {/* Contenedor del visor */}
      <div className="visor360__viewer-wrapper">
        {/* Loading overlay */}
        <div className={`visor360__loading ${!cargando ? 'visor360__loading--hidden' : ''}`}>
          <div className="visor360__spinner" />
          <span className="visor360__loading-text">Cargando panorama 360°...</span>
        </div>

        {/* Pannellum viewer */}
        <div ref={viewerRef} className="visor360__viewer" id="visor360-pannellum" />

        {/* Barra inferior de controles */}
        <div className="visor360__controls">
          <div className="visor360__scene-label">
            {tieneMasDeUnPiso && (
              <span className="visor360__scene-badge">{pisoActivo}</span>
            )}
            <span>{escenaActiva?.habitacion || 'Vista 360°'}</span>
          </div>
          <button
            className="visor360__fullscreen-btn"
            onClick={toggleFullscreen}
            type="button"
          >
            <Maximize2 size={14} />
            Pantalla completa
          </button>
        </div>
      </div>
    </div>
  );
};

export default Visor360;
