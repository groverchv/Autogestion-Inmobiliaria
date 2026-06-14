import { useEffect, useState, useMemo, useRef } from 'react';
import { X, Layers, Gamepad, Wifi } from 'lucide-react';
import './VisorVRGlasses.css';

const VisorVRGlasses = ({ panoramas = [], onClose }) => {
  const [escenaActiva, setEscenaActiva] = useState(panoramas[0] || null);
  const [lastEvent, setLastEvent] = useState('Ninguno (Presiona botones en tu control)');
  const [gamepadInfo, setGamepadInfo] = useState({ connected: false, name: '' });
  const [showDebug, setShowDebug] = useState(true);
  const [modoNavegacion, setModoNavegacion] = useState('manual'); // 'manual' o 'vr'
  const [pantallaDoble, setPantallaDoble] = useState(false);

  const togglePantallaDoble = (doble) => {
    const sceneEl = document.querySelector('a-scene');
    if (!sceneEl) return;
    try {
      if (doble) {
        sceneEl.enterVR();
        setPantallaDoble(true);
      } else {
        sceneEl.exitVR();
        setPantallaDoble(false);
      }
    } catch (err) {
      console.warn("No se pudo alternar el modo VR de A-Frame:", err);
    }
  };

  useEffect(() => {
    // Escuchar cambios de estado VR nativos de A-Frame para sincronizar botones
    const sceneEl = document.querySelector('a-scene');
    if (!sceneEl) return;

    const handleEnterVR = () => setPantallaDoble(true);
    const handleExitVR = () => setPantallaDoble(false);

    sceneEl.addEventListener('enter-vr', handleEnterVR);
    sceneEl.addEventListener('exit-vr', handleExitVR);

    return () => {
      sceneEl.removeEventListener('enter-vr', handleEnterVR);
      sceneEl.removeEventListener('exit-vr', handleExitVR);
    };
  }, [escenaActiva]);

  const escenaActivaRef = useRef(escenaActiva);
  const panoramasRef = useRef(panoramas);

  useEffect(() => {
    escenaActivaRef.current = escenaActiva;
  }, [escenaActiva]);

  useEffect(() => {
    panoramasRef.current = panoramas;
  }, [panoramas]);

  useEffect(() => {
    // Importar A-Frame dinámicamente en el montaje para evitar errores de SSR / Node.js
    import('aframe');
  }, []);

  const triggerActiveHotspot = () => {
    setLastEvent('Botón Seleccionar (Gatillo/Enter)');
    const cursorEl = document.querySelector('a-cursor');
    if (cursorEl && cursorEl.components.cursor) {
      const intersectedEl = cursorEl.components.cursor.intersectedEl;
      if (intersectedEl) {
        intersectedEl.click();
      }
    }
  };

  const goToNextRoom = () => {
    const currentPanos = panoramasRef.current;
    const currentEscena = escenaActivaRef.current;
    if (!currentEscena || currentPanos.length <= 1) return;

    const currentIndex = currentPanos.findIndex(p => p.id === currentEscena.id);
    let nextEscena;
    if (currentIndex !== -1 && currentIndex < currentPanos.length - 1) {
      nextEscena = currentPanos[currentIndex + 1];
    } else {
      nextEscena = currentPanos[0];
    }
    setEscenaActiva(nextEscena);
    const nombre = nextEscena.descripcion?.includes('|') ? nextEscena.descripcion.split('|')[1].trim() : nextEscena.descripcion || 'Siguiente';
    setLastEvent(`Siguiente habitación: ${nombre}`);
  };

  const goToPrevRoom = () => {
    const currentPanos = panoramasRef.current;
    const currentEscena = escenaActivaRef.current;
    if (!currentEscena || currentPanos.length <= 1) return;

    const currentIndex = currentPanos.findIndex(p => p.id === currentEscena.id);
    let prevEscena;
    if (currentIndex > 0) {
      prevEscena = currentPanos[currentIndex - 1];
    } else {
      prevEscena = currentPanos[currentPanos.length - 1];
    }
    setEscenaActiva(prevEscena);
    const nombre = prevEscena.descripcion?.includes('|') ? prevEscena.descripcion.split('|')[1].trim() : prevEscena.descripcion || 'Anterior';
    setLastEvent(`Habitación anterior: ${nombre}`);
  };

  // 1. Escuchar botones en modo Teclado (Key Mode)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;
      const keyLower = key?.toLowerCase();

      // Debug: Mostrar qué tecla se recibió
      setLastEvent(`Tecla: "${key}"`);

      // Botón A / Gatillo / Selección
      if (key === ' ' || key === 'Enter' || key === 'Trigger' || key === 'Select' || key === 'MediaPlayPause') {
        e.preventDefault();
        triggerActiveHotspot();
      }

      // Botón B / Retroceso / Cancelar
      if (key === 'Escape' || key === 'Backspace' || keyLower === 'q') {
        e.preventDefault();
        onClose();
      }

      // Botones C y D / Volumen / Dirección (Cambio de habitación)
      if (keyLower === 'd' || keyLower === 'n' || key === 'ArrowRight' || key === 'VolumeUp' || key === 'AudioVolumeUp' || key === 'MediaTrackNext' || key === 'PageDown') {
        e.preventDefault();
        goToNextRoom();
      }

      if (keyLower === 'c' || keyLower === 'p' || key === 'ArrowLeft' || key === 'VolumeDown' || key === 'AudioVolumeDown' || key === 'MediaTrackPrevious' || key === 'PageUp') {
        e.preventDefault();
        goToPrevRoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 2. Polling de Gamepad API (para controles VR bluetooth reales)
  useEffect(() => {
    let gamepadTimer;
    let lastButtonStates = {};
    let activeJoystickKeys = { w: false, a: false, s: false, d: false };

    const checkGamepads = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let activeGamepad = null;

      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          activeGamepad = gamepads[i];
          break;
        }
      }

      if (activeGamepad) {
        if (!gamepadInfo.connected || gamepadInfo.name !== activeGamepad.id) {
          setGamepadInfo({ connected: true, name: activeGamepad.id });
        }

        // Leer botones
        activeGamepad.buttons.forEach((btn, index) => {
          const pressed = btn.pressed || btn.value > 0.5;
          const wasPressed = lastButtonStates[index] || false;

          if (pressed && !wasPressed) {
            setLastEvent(`Botón Gamepad #${index}`);
            // Mapeo universal de botones VR
            if (index === 0 || index === 6 || index === 7) {
              // Trigger / Botón principal A
              triggerActiveHotspot();
            } else if (index === 1 || index === 8 || index === 9) {
              // Botón Atrás / B / Start
              onClose();
            } else if (index === 2 || index === 4) {
              // L1 / Botón X -> Anterior
              goToPrevRoom();
            } else if (index === 3 || index === 5) {
              // R1 / Botón Y -> Siguiente
              goToNextRoom();
            }
          }
          lastButtonStates[index] = pressed;
        });

        // Simular WASD / Palanca analógica para caminar
        const axisX = activeGamepad.axes[0];
        const axisY = activeGamepad.axes[1];
        const threshold = 0.35;

        const setEmulatedKey = (key, press) => {
          if (press && !activeJoystickKeys[key]) {
            activeJoystickKeys[key] = true;
            window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
          } else if (!press && activeJoystickKeys[key]) {
            activeJoystickKeys[key] = false;
            window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
          }
        };

        setEmulatedKey('w', axisY < -threshold);
        setEmulatedKey('s', axisY > threshold);
        setEmulatedKey('a', axisX < -threshold);
        setEmulatedKey('d', axisX > threshold);
      } else {
        if (gamepadInfo.connected) {
          setGamepadInfo({ connected: false, name: '' });
        }
      }

      gamepadTimer = requestAnimationFrame(checkGamepads);
    };

    gamepadTimer = requestAnimationFrame(checkGamepads);

    return () => {
      cancelAnimationFrame(gamepadTimer);
      // Limpiar teclas emuladas activas
      Object.keys(activeJoystickKeys).forEach(key => {
        if (activeJoystickKeys[key]) {
          window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
        }
      });
    };
  }, [gamepadInfo, onClose]);

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
        <div className="visor-vr-glasses__nav-group">
          <button
            className="visor-vr-glasses__close-btn"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
            <span>Salir de VR</span>
          </button>

          <div className="visor-vr-glasses__mode-selector">
            <button
              className={`mode-btn ${modoNavegacion === 'manual' ? 'active' : ''}`}
              onClick={() => setModoNavegacion('manual')}
              type="button"
            >
              Manual (Táctil)
            </button>
            <button
              className={`mode-btn ${modoNavegacion === 'vr' ? 'active' : ''}`}
              onClick={() => setModoNavegacion('vr')}
              type="button"
            >
              VR (Gafas/Mando)
            </button>
          </div>

          <div className="visor-vr-glasses__screen-selector">
            <button
              className={`mode-btn ${!pantallaDoble ? 'active' : ''}`}
              onClick={() => togglePantallaDoble(false)}
              type="button"
            >
              Pantalla Única
            </button>
            <button
              className={`mode-btn ${pantallaDoble ? 'active' : ''}`}
              onClick={() => togglePantallaDoble(true)}
              type="button"
            >
              Pantalla Doble
            </button>
          </div>
        </div>

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

      {/* Panel de Estado / Diagnóstico del Control Remoto */}
      {showDebug && modoNavegacion === 'vr' && (
        <div className="visor-vr-glasses__debug-panel">
          <div className="visor-vr-glasses__debug-header">
            <span className="visor-vr-glasses__debug-title">
              <Gamepad size={14} /> Control Bluetooth VR
            </span>
            <button
              className="visor-vr-glasses__debug-close"
              onClick={() => setShowDebug(false)}
              title="Ocultar info"
            >
              <X size={12} />
            </button>
          </div>
          <div className="visor-vr-glasses__debug-body">
            <div className="visor-vr-glasses__debug-row">
              <span className="label">Estado:</span>
              <span className={`val ${gamepadInfo.connected ? 'connected' : 'searching'}`}>
                {gamepadInfo.connected ? 'Gamepad Activo' : 'Buscando control...'}
              </span>
            </div>
            {gamepadInfo.connected && (
              <div className="visor-vr-glasses__debug-row">
                <span className="label">Dispositivo:</span>
                <span className="val name">{gamepadInfo.name}</span>
              </div>
            )}
            <div className="visor-vr-glasses__debug-row">
              <span className="label">Último comando:</span>
              <span className="val event">{lastEvent}</span>
            </div>
            <div className="visor-vr-glasses__debug-help">
              Mapeo: A/Gatillo = Seleccionar | Joystick = Caminar | C/D o L1/R1 = Cambiar Habitación
            </div>
          </div>
        </div>
      )}

      {/* Escena VR en A-Frame */}
      <a-scene 
        embedded 
        cursor={modoNavegacion === 'manual' ? 'rayOrigin: mouse; fuse: false' : ''}
        style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 1000 }}
      >
        <a-assets>
          {/* Cargar dinámicamente la imagen con cabeceras anónimas CORS solo si no es un blob local */}
          <img
            id={`pano-${escenaActiva.id}`}
            src={escenaActiva.archivo}
            crossOrigin={escenaActiva.archivo?.startsWith('blob:') ? undefined : 'anonymous'}
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

        {/* Cámara con controles de mirada y movimiento (WASD / Joystick del mando) */}
        <a-camera look-controls wasd-controls="enabled: true; fly: false; acceleration: 65">
          {modoNavegacion === 'vr' && (
            <a-cursor
              color="#3b82f6"
              fuse="true"
              fuse-timeout="1500"
              design="ring"
              animation__fusing="property: scale; startEvents: fusing; easing: easeInCubic; dur: 1500; from: 1 1 1; to: 0.1 0.1 0.1"
              animation__click="property: scale; startEvents: click; easing: easeInCubic; dur: 150; from: 0.1 0.1 0.1; to: 1 1 1"
              animation__mouseleave="property: scale; startEvents: mouseleave; easing: easeInCubic; dur: 500; to: 1 1 1"
            ></a-cursor>
          )}
        </a-camera>
      </a-scene>
    </div>
  );
};

export default VisorVRGlasses;
