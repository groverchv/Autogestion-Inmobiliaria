import { useEffect, useState, useMemo } from 'react';
import { X, Layers } from 'lucide-react';
import './VisorVRGlasses.css';

const VisorVRGlasses = ({ panoramas = [], onClose }) => {
  const [escenaActiva, setEscenaActiva] = useState(panoramas[0] || null);

  useEffect(() => {
    // Importar A-Frame dinámicamente en el montaje para evitar errores de SSR / Node.js
    import('aframe');
  }, []);

  // 1. Escuchar botones del control remoto Bluetooth VR
  // La mayoría de los controles VR en modo "Key" o "Game" envían eventos de teclado (Enter, Space, etc.)
  // Al presionar un botón del control, forzamos un clic en la entidad apuntada por la mirada (cursor).
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Teclas comunes enviadas por gatillos y botones de controles VR
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Trigger') {
        const cursorEl = document.querySelector('a-cursor');
        if (cursorEl && cursorEl.components.cursor) {
          const intersectedEl = cursorEl.components.cursor.intersectedEl;
          if (intersectedEl) {
            intersectedEl.click();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 2. Convertir coordenadas esféricas (pitch, yaw) a coordenadas cartesianas 3D (x, y, z)
  const getPositionFromPitchYaw = (pitch, yaw, radius = 3.5) => {
    const phi = (pitch * Math.PI) / 180;
    const theta = (yaw * Math.PI) / 180;

    // Fórmulas de conversión matemática a espacio 3D A-Frame
    const x = radius * Math.cos(phi) * Math.sin(theta);
    const y = radius * Math.sin(phi);
    const z = -radius * Math.cos(phi) * Math.cos(theta);

    return `${x} ${y} ${z}`;
  };

  // 3. Buscar y asociar los hotspots reales de la escena activa
  const hotspots3D = useMemo(() => {
    if (!escenaActiva) return [];
    return (escenaActiva.hotspots || []).map((h) => {
      const destinoPano = panoramas.find((p) => p.id === h.escena_destino);
      let label = h.texto_ayuda || '';
      if (!label && destinoPano) {
        const desc = destinoPano.descripcion || '';
        label = desc.includes('|') ? desc.split('|')[1].trim() : desc;
      }
      return {
        ...h,
        label: label.toUpperCase(),
        position: getPositionFromPitchYaw(h.pitch, h.yaw),
        destinoPano,
      };
    });
  }, [escenaActiva, panoramas]);

  if (!escenaActiva) return null;

  return (
    <div className="visor-vr-glasses">
      {/* Controles Flotantes 2D */}
      <div className="visor-vr-glasses__ui">
        <button
          className="visor-vr-glasses__close-btn"
          onClick={onClose}
          type="button"
        >
          <X size={18} />
          <span>Salir de VR</span>
        </button>

        {panoramas.length > 1 && (
          <div className="visor-vr-glasses__selector">
            <span className="visor-vr-glasses__selector-title">
              <Layers size={14} /> Habitaciones:
            </span>
            <div className="visor-vr-glasses__btns">
              {panoramas.map((pano) => {
                const habitacion = pano.descripcion?.includes('|')
                  ? pano.descripcion.split('|')[1].trim()
                  : pano.descripcion || 'Vista 360°';

                return (
                  <button
                    key={pano.id}
                    className={`visor-vr-glasses__pano-btn ${
                      escenaActiva.id === pano.id ? 'active' : ''
                    }`}
                    onClick={() => setEscenaActiva(pano)}
                    type="button"
                  >
                    {habitacion}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Escena VR en A-Frame */}
      <a-scene embedded style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 1000 }}>
        <a-assets>
          {/* Cargar dinámicamente la imagen con cabeceras anónimas CORS */}
          <img
            id={`pano-${escenaActiva.id}`}
            src={`${escenaActiva.archivo}`}
            crossOrigin="anonymous"
            alt={escenaActiva.descripcion}
          />
        </a-assets>

        {/* Esfera 360° */}
        <a-sky
          src={`#pano-${escenaActiva.id}`}
          rotation="0 -90 0"
          animation="property: rotation; to: 0 270 0; dur: 60000; easing: linear; loop: true"
        ></a-sky>

        {/* Hotspots 3D Interactivos */}
        {hotspots3D.map((h, idx) => (
          <a-entity
            key={`${escenaActiva.id}-hotspot-${idx}`}
            position={h.position}
            onClick={() => {
              if (h.destinoPano) {
                setEscenaActiva(h.destinoPano);
              }
            }}
          >
            {/* Esfera brillante interactiva */}
            <a-sphere
              radius="0.16"
              color="#3b82f6"
              material="emissive: #2563eb; emissiveIntensity: 1; roughness: 0.1"
              animation="property: scale; to: 1.2 1.2 1.2; dir: alternate; dur: 800; loop: true"
            ></a-sphere>

            {/* Aro de selección exterior */}
            <a-ring
              radius-inner="0.22"
              radius-outer="0.26"
              color="#60a5fa"
              material="side: double; opacity: 0.8"
            ></a-ring>

            {/* Etiqueta de Texto Flotante */}
            <a-text
              value={h.label}
              align="center"
              position="0 0.45 0"
              scale="0.8 0.8 0.8"
              color="#ffffff"
              font="kells"
              width="4"
            ></a-text>
          </a-entity>
        ))}

        {/* Cámara con controles de mirada interactivos */}
        <a-camera look-controls>
          <a-cursor
            color="#3b82f6"
            fuse="true"
            fuse-timeout="1500"
            design="ring"
            animation__fusing="property: scale; startEvents: fusing; easing: easeInCubic; dur: 1500; from: 1 1 1; to: 0.1 0.1 0.1"
            animation__click="property: scale; startEvents: click; easing: easeInCubic; dur: 150; from: 0.1 0.1 0.1; to: 1 1 1"
            animation__mouseleave="property: scale; startEvents: mouseleave; easing: easeInCubic; dur: 500; to: 1 1 1"
          ></a-cursor>
        </a-camera>
      </a-scene>
    </div>
  );
};

export default VisorVRGlasses;
