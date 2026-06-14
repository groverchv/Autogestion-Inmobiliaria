import { useEffect, useState, useMemo, useRef } from 'react';
import { X, Layers, Gamepad, Smartphone } from 'lucide-react';
import './VisorVRGlasses.css';

const VisorVRGlasses = ({ panoramas = [], onClose }) => {
  const [escenaActiva, setEscenaActiva] = useState(panoramas[0] || null);
  const [lastEvent, setLastEvent] = useState('Ninguno (Presiona botones en tu control)');
  const [gamepadInfo, setGamepadInfo] = useState({ connected: false, name: '' });
  const [showDebug, setShowDebug] = useState(false); // Oculto por defecto
  const [modoNavegacion, setModoNavegacion] = useState('vr'); // Por defecto directamente en modo VR/Gafas
  const [pantallaDoble, setPantallaDoble] = useState(false);
  const [gyroPermission, setGyroPermission] = useState('unknown');
  const [mostrarInstrucciones, setMostrarInstrucciones] = useState(true);

  const sensorInicializado = useRef(false);
  const escenaActivaRef = useRef(escenaActiva);
  const panoramasRef = useRef(panoramas);

  useEffect(() => {
    // Sincronizar referencias para callbacks asíncronos
    escenaActivaRef.current = escenaActiva;
  }, [escenaActiva]);

  useEffect(() => {
    panoramasRef.current = panoramas;
  }, [panoramas]);

  useEffect(() => {
    // Verificar si se requiere solicitar permisos de giroscopio (iOS)
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      setGyroPermission('prompt');
    } else {
      setGyroPermission('granted');
    }
  }, []);

  const reloadLookControls = () => {
    const sceneEl = document.querySelector('a-scene');
    if (sceneEl) {
      const cameraEl = sceneEl.querySelector('a-camera');
      if (cameraEl) {
        cameraEl.removeAttribute('look-controls');
        setTimeout(() => {
          cameraEl.setAttribute(
            'look-controls',
            'magicWindowTrackingEnabled: true; touchEnabled: true; mouseEnabled: true'
          );
          console.log('look-controls re-initialized successfully');
        }, 80);
      }
    }
  };

  const solicitarPermisoGiroscopio = async (silencioso = false) => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const permissionState = await DeviceOrientationEvent.requestPermission();
        setGyroPermission(permissionState);
        if (permissionState === 'granted') {
          reloadLookControls();
          sensorInicializado.current = true;
          if (!silencioso) {
            alert('¡Permiso de sensor de movimiento concedido!');
          }
        } else {
          if (!silencioso) {
            alert('Permiso de giroscopio denegado.');
          }
        }
      } catch (err) {
        console.error('Error al solicitar permiso de giroscopio:', err);
        if (!silencioso) {
          alert('Error al solicitar permiso: ' + err.message);
        }
      }
    } else {
      setGyroPermission('granted');
      reloadLookControls();
      sensorInicializado.current = true;
      if (!silencioso) {
        alert('El sensor de movimiento ya está activo y soportado.');
      }
    }
  };

  const handleVisorClick = () => {
    if (gyroPermission === 'prompt') {
      solicitarPermisoGiroscopio(true);
    } else if (!sensorInicializado.current) {
      reloadLookControls();
      sensorInicializado.current = true;
    }
  };

  const toggleOrientacion = async () => {
    try {
      const isLandscape = screen.orientation?.type.includes('landscape');
      const target = isLandscape ? 'portrait' : 'landscape';

      // Lock de orientación generalmente requiere pantalla completa
      if (!document.fullscreenElement) {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      }

      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock(target);
      } else {
        alert('Gira físicamente tu móvil para cambiar entre vertical y horizontal.');
      }
    } catch (err) {
      console.warn('No se pudo bloquear la orientación:', err);
      alert('Para cambiar de vista vertical/horizontal, activa la rotación automática en tu móvil y gíralo.');
    }
  };

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
    // Sincronizar salida de VR nativo (ej: al presionar 'Back' físico en VR de A-Frame)
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

      // Botón @ (Mapeado a la tecla @, o gatillo en algunos teclados)
      if (key === '@' || keyLower === '@') {
        e.preventDefault();
        triggerActiveHotspot();
        return;
      }

      // Botón A (Siguiente imagen)
      if (keyLower === 'a' || key === 'ArrowRight' || key === 'VolumeUp' || key === 'AudioVolumeUp' || key === 'MediaTrackNext' || key === 'PageDown') {
        e.preventDefault();
        goToNextRoom();
        return;
      }

      // Botón B (Imagen anterior)
      if (keyLower === 'b' || key === 'ArrowLeft' || key === 'VolumeDown' || key === 'AudioVolumeDown' || key === 'MediaTrackPrevious' || key === 'PageUp') {
        e.preventDefault();
        goToPrevRoom();
        return;
      }

      // Otros botones de Gatillo / Selección / Fallback
      if (key === ' ' || key === 'Enter' || key === 'Trigger' || key === 'Select' || key === 'MediaPlayPause') {
        e.preventDefault();
        triggerActiveHotspot();
      }

      // Botón de salir / atrás
      if (key === 'Escape' || key === 'Backspace' || keyLower === 'q') {
        e.preventDefault();
        onClose();
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
            // Mapeo adaptado al control del usuario:
            if (index === 0) {
              // Botón A -> Siguiente Imagen
              goToNextRoom();
            } else if (index === 1) {
              // Botón B -> Imagen Anterior
              goToPrevRoom();
            } else {
              // Botón @ / Trigger / Cualquier otro -> Seleccionar hotspot apuntado
              triggerActiveHotspot();
            }
          }
          lastButtonStates[index] = pressed;
        });

        // Simular WASD / Palanca analógica para caminar hacia adelante y atrás
        const axisX = activeGamepad.axes[0]; // -1 izquierda, 1 derecha
        const axisY = activeGamepad.axes[1]; // -1 arriba, 1 abajo
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

        setEmulatedKey('w', axisY < -threshold); // Joystick arriba -> Avanzar (W)
        setEmulatedKey('s', axisY > threshold);  // Joystick abajo -> Retroceder (S)
        setEmulatedKey('a', axisX < -threshold); // Izquierda
        setEmulatedKey('d', axisX > threshold);  // Derecha
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
    <div className="visor-vr-glasses" onClick={handleVisorClick} onTouchStart={handleVisorClick}>
      
      {/* 1. Modal de Instrucciones de VR y Mando */}
      {mostrarInstrucciones && (
        <div className="visor-vr-glasses__instructions-overlay">
          <div className="visor-vr-glasses__instructions-card" onClick={(e) => e.stopPropagation()}>
            <h3>🕶️ Instrucciones de Recorrido VR</h3>
            <p className="subtitle">Uso de tus Gafas VR y Mando Bluetooth:</p>
            
            <div className="instruction-steps">
              <div className="step">
                <span className="step-num">A</span>
                <div>
                  <strong>Avanzar Habitación:</strong> Presiona el botón <strong>A</strong> en tu mando para cambiar a la siguiente habitación.
                </div>
              </div>
              <div className="step">
                <span className="step-num">B</span>
                <div>
                  <strong>Retroceder Habitación:</strong> Presiona el botón <strong>B</strong> en tu mando para regresar a la habitación anterior.
                </div>
              </div>
              <div className="step">
                <span className="step-num">@</span>
                <div>
                  <strong>Entrar a un Enlace:</strong> Apunta la mirada (círculo azul) hacia una esfera de transición y presiona el botón <strong>@</strong> (o gatillo) para teletransportarte.
                </div>
              </div>
              <div className="step">
                <span className="step-num">🕹️</span>
                <div>
                  <strong>Desplazarte:</strong> Empuja la palanca o joystick hacia <strong>adelante</strong> para avanzar en el espacio o hacia <strong>atrás</strong> para retroceder.
                </div>
              </div>
            </div>

            <div className="instructions-actions">
              <button 
                className="start-vr-btn"
                onClick={() => {
                  setMostrarInstrucciones(false);
                  togglePantallaDoble(true); // Entrar a VR pantalla doble directamente
                }}
                type="button"
              >
                Empezar Recorrido (Pantalla Doble)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Cabecera de controles flotantes (Solo visible en vista plana/manual, se oculta en Pantalla Doble VR) */}
      {!pantallaDoble && (
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

            {/* Botón para cambiar orientación de pantalla */}
            <button
              className="visor-vr-glasses__close-btn"
              onClick={toggleOrientacion}
              title="Cambiar orientación de pantalla"
              type="button"
            >
              <Smartphone size={16} />
              <span>Girar Pantalla</span>
            </button>

            {/* Solicitar permisos de giroscopio si es necesario */}
            {gyroPermission === 'prompt' && (
              <button
                className="visor-vr-glasses__close-btn"
                style={{ background: '#f59e0b', color: '#fff', borderColor: '#d97706' }}
                onClick={solicitarPermisoGiroscopio}
                title="Activar sensor de movimiento"
                type="button"
              >
                <span>Activar Giroscopio</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Selector de Habitaciones en la parte inferior (Solo visible en vista plana/manual) */}
      {!pantallaDoble && panoramas.length > 1 && (
        <div className="visor-vr-glasses__selector" onClick={(e) => e.stopPropagation()}>
          <span className="visor-vr-glasses__selector-title">
            <Layers size={14} /> <span>Habitaciones:</span>
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

      {/* Panel de Estado del Control Remoto (Solo PC/Desarrollo) */}
      {showDebug && !pantallaDoble && (
        <div className="visor-vr-glasses__debug-panel">
          <div className="visor-vr-glasses__debug-body">
            <div className="visor-vr-glasses__debug-row">
              <span className="label">Mando Bluetooth:</span>
              <span className={`val ${gamepadInfo.connected ? 'connected' : 'searching'}`}>
                {gamepadInfo.connected ? 'Conectado' : 'Buscando...'}
              </span>
            </div>
            <div className="visor-vr-glasses__debug-row">
              <span className="label">Comando:</span>
              <span className="val event">{lastEvent}</span>
            </div>
          </div>
        </div>
      )}

      {/* Escena VR en A-Frame */}
      <a-scene 
        embedded 
        cursor="rayOrigin: mouse; fuse: false"
        style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 1000 }}
      >
        <a-assets>
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
            <a-sphere
              radius="0.16"
              color="#3b82f6"
              material="emissive: #2563eb; emissiveIntensity: 1; roughness: 0.1"
              animation="property: scale; to: 1.2 1.2 1.2; dir: alternate; dur: 800; loop: true"
            ></a-sphere>

            <a-ring
              radius-inner="0.22"
              radius-outer="0.26"
              color="#60a5fa"
              material="side: double; opacity: 0.8"
            ></a-ring>

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
        <a-camera look-controls="magicWindowTrackingEnabled: true; touchEnabled: true; mouseEnabled: true" wasd-controls="enabled: true; fly: false; acceleration: 65">
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
