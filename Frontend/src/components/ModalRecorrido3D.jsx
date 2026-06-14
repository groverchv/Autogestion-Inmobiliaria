import { useState, useEffect, useRef, useMemo } from 'react';
import { X } from 'lucide-react';
import 'pannellum/build/pannellum.css';
import 'pannellum';
import VisorVRGlasses from './VisorVRGlasses';
import './ModalRecorrido3D.css';

/**
 * ModalRecorrido3D — Modal inmersivo a pantalla completa para el Recorrido Virtual 360°.
 *
 * Utiliza Pannellum Multi-Scene API para navegación espacial fluida 3D con hotspots.
 *
 * @param {object} props
 * @param {Array} props.panoramas - Lista de panoramas del inmueble (con hotspots anidados).
 * @param {string} props.tituloPropiedad - Título de la propiedad.
 * @param {Function} props.onClose - Callback al cerrar el modal.
 */
const ModalRecorrido3D = ({ panoramas = [], tituloPropiedad = '', onClose }) => {
  const viewerRef = useRef(null);
  const viewerInstanceRef = useRef(null);
  const [blobUrls, setBlobUrls] = useState({});
  const [cargandoDescarga, setCargandoDescarga] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Iniciando recorrido virtual...');
  const [escenaActivaId, setEscenaActivaId] = useState(null);
  const [uiVisible, setUiVisible] = useState(true);
  const [showVRGlasses, setShowVRGlasses] = useState(false);

  // 1. Pre-descargar todos los panoramas para evadir CORS y acelerar transiciones
  useEffect(() => {
    let active = true;
    const downloadAll = async () => {
      const urls = {};
      setCargandoDescarga(true);

      for (let i = 0; i < panoramas.length; i++) {
        if (!active) return;
        const pano = panoramas[i];
        setLoadingText(`Cargando ${pano.descripcion || `Habitación ${i + 1}`}...`);
        setLoadingProgress(Math.round((i / panoramas.length) * 100));

        try {
          const response = await fetch(pano.archivo, { cache: 'reload', mode: 'cors' });
          const blob = await response.blob();
          urls[pano.id] = URL.createObjectURL(blob);
        } catch (fetchError) {
          console.warn(`Fallo fetch CORS para panorama ${pano.id}, usando URL directa:`, fetchError);
          // Fallback a la URL directa con timestamp para romper caché agresiva
          urls[pano.id] = `${pano.archivo}?cb=${new Date().getTime()}`;
        }
      }

      if (active) {
        setBlobUrls(urls);
        setLoadingProgress(100);
        // La primera escena por defecto
        if (panoramas.length > 0) {
          setEscenaActivaId(panoramas[0].id);
        }
        setCargandoDescarga(false);
      }
    };

    downloadAll();

    return () => {
      active = false;
      // Revocar ObjectURLs para liberar memoria
      Object.values(blobUrls).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [panoramas]);

  // 2. Construir la configuración de escenas de Pannellum
  const scenesConfig = useMemo(() => {
    if (Object.keys(blobUrls).length === 0) return null;
    const config = {};

    panoramas.forEach((pano) => {
      const panoUrl = blobUrls[pano.id] || pano.archivo;
      config[`scene_${pano.id}`] = {
        title: pano.descripcion || 'Habitación',
        type: 'equirectangular',
        panorama: panoUrl,
        autoLoad: true,
        crossOrigin: 'anonymous',
        hotSpots: (pano.hotspots || []).map((h) => {
          const destinoPano = panoramas.find((p) => p.id === h.escena_destino);
          let nombreDestino = h.texto_ayuda || '';
          if (!nombreDestino && destinoPano) {
            const desc = destinoPano.descripcion || '';
            nombreDestino = desc.includes('|') ? desc.split('|')[1].trim() : desc;
          }
          if (!nombreDestino) {
            nombreDestino = 'Siguiente';
          }

          return {
            pitch: h.pitch,
            yaw: h.yaw,
            type: 'scene',
            sceneId: `scene_${h.escena_destino}`,
            createTooltipFunc: (hotSpotDiv, args) => {
              hotSpotDiv.classList.add('pnlm-custom-nav-hotspot');

              // Crear etiqueta de texto visible permanente
              const labelEl = document.createElement('div');
              labelEl.className = 'pnlm-custom-nav-label';
              labelEl.innerText = args;

              // Delegación Activa: Si el usuario toca o hace clic en la etiqueta, 
              // forzamos la transición directamente y evitamos que Pannellum crea que es un arrastre.
              const triggerTeleport = (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (viewerInstanceRef.current) {
                  viewerInstanceRef.current.loadScene(`scene_${h.escena_destino}`);
                }
              };

              labelEl.addEventListener('pointerdown', triggerTeleport);
              labelEl.addEventListener('click', triggerTeleport);

              hotSpotDiv.appendChild(labelEl);
            },
            createTooltipArgs: nombreDestino.toUpperCase()
          };
        }),
      };
    });

    return config;
  }, [panoramas, blobUrls]);

  // 3. Inicializar el Visor Multi-Scene de Pannellum
  useEffect(() => {
    if (cargandoDescarga || !scenesConfig || !viewerRef.current || panoramas.length === 0) return;

    const firstPanoId = panoramas[0].id;

    if (viewerInstanceRef.current) {
      try {
        viewerInstanceRef.current.destroy();
      } catch {
        // Ignorar
      }
      viewerInstanceRef.current = null;
    }

    try {
      if (!window.pannellum) {
        throw new Error('Pannellum no está cargado globalmente en window');
      }

      const viewer = window.pannellum.viewer(viewerRef.current, {
        default: {
          firstScene: `scene_${firstPanoId}`,
          sceneFadeDuration: 1200,
          autoLoad: true,
          crossOrigin: 'anonymous',
          autoRotate: 0,
          compass: false,
          showZoomCtrl: false,
          showFullscreenCtrl: false,
          mouseZoom: true,
          draggable: true,
          hfov: 100,
          minHfov: 50,
          maxHfov: 120,
          friction: 0.15,
        },
        scenes: scenesConfig,
      });

      viewerInstanceRef.current = viewer;

      // Escuchar cambios de escena para sincronizar el estado del carrusel y animar el zoom-out
      viewer.on('scenechange', (sceneId) => {
        const idStr = sceneId.replace('scene_', '');
        const idNum = parseInt(idStr, 10);
        if (!isNaN(idNum)) {
          setEscenaActivaId(idNum);
        }

        // Efecto premium: Animar zoom-out (hfov = 100) en la nueva escena (simula entrar físicamente)
        setTimeout(() => {
          if (viewerInstanceRef.current) {
            const currentPitch = viewerInstanceRef.current.getPitch();
            const currentYaw = viewerInstanceRef.current.getYaw();
            viewerInstanceRef.current.lookAt(currentPitch, currentYaw, 100, 1000);
          }
        }, 150);
      });
    } catch (err) {
      console.error('Error inicializando Pannellum Multi-Scene:', err);
    }

    return () => {
      if (viewerInstanceRef.current) {
        try {
          viewerInstanceRef.current.destroy();
        } catch {
          // Ignorar
        }
        viewerInstanceRef.current = null;
      }
    };
  }, [cargandoDescarga, scenesConfig, panoramas]);

  // 4. Cambiar escena manualmente al hacer clic en las miniaturas del carrusel
  const handleSceneTeleport = (id) => {
    if (id === escenaActivaId) return;
    if (viewerInstanceRef.current) {
      viewerInstanceRef.current.loadScene(`scene_${id}`);
      setEscenaActivaId(id);
    }
  };

  const activePano = useMemo(() => {
    return panoramas.find((p) => p.id === escenaActivaId) || panoramas[0];
  }, [panoramas, escenaActivaId]);

  return (
    <div className="modal-recorrido">
      {/* ─── Botones de Control Mínimos ─── */}
      {!cargandoDescarga && (
        <div className="modal-recorrido__top-controls">
          <button
            className="modal-recorrido__vr-btn-minimal"
            onClick={() => setShowVRGlasses(true)}
            type="button"
            title="Activar Modo Gafas VR"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0"/>
              <path d="M6 12c1.5-1 2.5-1 6 0s4.5 1 6 0"/>
              <circle cx="9" cy="12" r="1.5"/>
              <circle cx="15" cy="12" r="1.5"/>
            </svg>
            <span>Modo Gafas VR</span>
          </button>

          <button
            className="modal-recorrido__close-btn-minimal"
            onClick={onClose}
            aria-label="Cerrar recorrido"
            type="button"
            title="Cerrar recorrido"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* ─── Pantalla de Carga Inmersiva ─── */}
      {cargandoDescarga && (
        <div className="modal-recorrido__loader">
          <div className="modal-recorrido__loader-card">
            <div className="modal-recorrido__spinner"></div>
            <h3>Preparando experiencia virtual</h3>
            <p className="modal-recorrido__loader-text">{loadingText}</p>
            <div className="modal-recorrido__progress-bar-bg">
              <div
                className="modal-recorrido__progress-bar-fg"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <span className="modal-recorrido__percentage">{loadingProgress}%</span>
          </div>
        </div>
      )}

      {/* ─── Contenedor de Pannellum ─── */}
      <div
        ref={viewerRef}
        className="modal-recorrido__viewer"
        id="modal-pannellum-container"
      />

      {showVRGlasses && (
        <VisorVRGlasses 
          panoramas={panoramas.map(pano => ({
            ...pano,
            archivo: blobUrls[pano.id] || pano.archivo
          }))} 
          onClose={() => setShowVRGlasses(false)} 
        />
      )}
    </div>
  );
};

export default ModalRecorrido3D;
