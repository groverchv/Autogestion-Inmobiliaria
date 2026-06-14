import { useEffect, useState } from 'react';
import { X, Layers } from 'lucide-react';
import './VisorVRGlasses.css';

const VisorVRGlasses = ({ panoramas = [], onClose }) => {
  const [escenaActiva, setEscenaActiva] = useState(panoramas[0] || null);

  useEffect(() => {
    // Importar A-Frame dinámicamente en el montaje para evitar errores de SSR / Node.js
    import('aframe');
  }, []);

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
          {panoramas.map((pano) => (
            <img
              key={pano.id}
              id={`pano-${pano.id}`}
              src={pano.archivo}
              crossOrigin="anonymous"
              alt={pano.descripcion}
            />
          ))}
        </a-assets>

        {/* Esfera 360° */}
        <a-sky
          key={escenaActiva.id}
          src={`#pano-${escenaActiva.id}`}
          rotation="0 -90 0"
          animation="property: rotation; to: 0 270 0; dur: 60000; easing: linear; loop: true"
        ></a-sky>

        {/* Cámara con controles de mirada interactivos */}
        <a-camera look-controls>
          <a-cursor
            color="#3b82f6"
            fuse="true"
            fuse-timeout="1500"
            design="ring"
          ></a-cursor>
        </a-camera>
      </a-scene>
    </div>
  );
};

export default VisorVRGlasses;
