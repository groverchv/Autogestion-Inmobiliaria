import { useEffect, useState, useMemo, useRef } from 'react';
import { X, Layers, Gamepad, Smartphone } from 'lucide-react';
import './VisorVRGlasses.css';

const VRIcon = ({ size = 20, style = {} }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px', ...style }}
  >
    <path d="M21 7H3c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h3.2c1 .7 2.4 1 3.8 1s2.8-.3 3.8-1H21c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM7.5 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm9 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
  </svg>
);

const VisorVRGlasses = ({ panoramas = [], onClose }) => {
  const [escenaActiva, setEscenaActiva] = useState(panoramas[0] || null);
  const [gamepadInfo, setGamepadInfo] = useState({ connected: false, name: '' });
  const [pantallaDoble, setPantallaDoble] = useState(false);
  const [gyroPermission, setGyroPermission] = useState('unknown');
  const [mostrarInstrucciones, setMostrarInstrucciones] = useState(true);

  // Estados para simular controles de videojuegos (rotación y zoom)
  const [rigRotation, setRigRotation] = useState(0); // Giro horizontal
  const [fov, setFov] = useState(80); // Zoom (Field of View)

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
    import('aframe');
  }, []);

  const triggerActiveHotspot = () => {
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
  };

  // 1. Escuchar botones en modo Teclado (Key Mode)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;
      const keyLower = key?.toLowerCase();

      // Botón @ (Mapeado a la tecla @, o gatillo en algunos teclados)
      if (key === '@' || keyLower === '@') {
        e.preventDefault();
        triggerActiveHotspot();
        return;
      }

      // Botón A (Siguiente imagen)
      if (keyLower === 'a') {
        e.preventDefault();
        goToNextRoom();
        return;
      }

      // Botón B (Imagen anterior)
      if (keyLower === 'b') {
        e.preventDefault();
        goToPrevRoom();
        return;
      }

      // Teclas de dirección alternativas para giro y zoom (Keyboard fallbacks)
      if (key === 'ArrowRight') {
        setRigRotation(prev => (prev + 5) % 360);
      }
      if (key === 'ArrowLeft') {
        setRigRotation(prev => (prev - 5 + 360) % 360);
      }
      if (key === 'ArrowUp') {
        setFov(prev => Math.max(30, prev - 2)); // zoom in
      }
      if (key === 'ArrowDown') {
        setFov(prev => Math.min(100, prev + 2)); // zoom out
      }

      // Mapeo del Joystick en modo Teclado/Multimedia (Giro y Zoom)
      if (key === 'VolumeUp' || key === 'AudioVolumeUp') {
        e.preventDefault();
        setFov(prev => Math.max(30, prev - 3)); // Zoom In (Acercar)
      }
      if (key === 'VolumeDown' || key === 'AudioVolumeDown') {
        e.preventDefault();
        setFov(prev => Math.min(100, prev + 3)); // Zoom Out (Alejar)
      }
      if (key === 'MediaTrackNext' || key === 'PageDown') {
        e.preventDefault();
        setRigRotation(prev => (prev + 8) % 360); // Giro Derecha
      }
      if (key === 'MediaTrackPrevious' || key === 'PageUp') {
        e.preventDefault();
        setRigRotation(prev => (prev - 8 + 360) % 360); // Giro Izquierda
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

        activeGamepad.buttons.forEach((btn, index) => {
          const pressed = btn.pressed || btn.value > 0.5;
          const wasPressed = lastButtonStates[index] || false;

          if (pressed && !wasPressed) {
            // Mapeo adaptado al control del usuario:
            if (index === 0) {
              goToNextRoom(); // Botón A -> Siguiente Imagen
            } else if (index === 1) {
              goToPrevRoom(); // Botón B -> Imagen Anterior
            } else {
              triggerActiveHotspot(); // Botón @ / Trigger -> Seleccionar hotspot apuntado
            }
          }
          lastButtonStates[index] = pressed;
        });

        // Ejes del Joystick / Palanca analógica - Búsqueda robusta en todos los ejes
        let axisX = 0;
        let axisY = 0;
        const threshold = 0.20; // Zona muerta ligeramente más sensible

        // 1. Intentamos con los ejes estándar 0 y 1
        if (activeGamepad.axes.length >= 2) {
          axisX = activeGamepad.axes[0];
          axisY = activeGamepad.axes[1];
        }

        // 2. Si no hay señal en 0 y 1, probamos los ejes alternativos (2, 3) comunes en mandos VR
        if (Math.abs(axisX) < 0.05 && Math.abs(axisY) < 0.05 && activeGamepad.axes.length >= 4) {
          axisX = activeGamepad.axes[2];
          axisY = activeGamepad.axes[3];
        }

        // 3. Si sigue sin haber señal, buscamos en cualquier eje disponible que tenga movimiento
        if (Math.abs(axisX) < 0.05 && Math.abs(axisY) < 0.05) {
          for (let j = 0; j < activeGamepad.axes.length; j++) {
            const val = activeGamepad.axes[j];
            if (Math.abs(val) > threshold) {
              if (j % 2 === 0) {
                axisX = val;
              } else {
                axisY = val;
              }
            }
          }
        }

        // 1. Giro horizontal con el Joystick (Izquierda / Derecha)
        if (Math.abs(axisX) > threshold) {
          setRigRotation(prev => {
            let nextRot = prev - axisX * 1.5; // Ajusta la velocidad de rotación
            if (nextRot < 0) nextRot += 360;
            if (nextRot > 360) nextRot -= 360;
            return nextRot;
          });
        }

        // 2. Acercar / Alejar (Zoom) con el Joystick (Arriba / Abajo)
        if (Math.abs(axisY) > threshold) {
          setFov(prev => {
            // axisY es negativo arriba (Zoom In / Acercar) y positivo abajo (Zoom Out / Alejar)
            let nextFov = prev + axisY * 0.8; // Ajusta la velocidad del zoom
            return Math.max(30, Math.min(100, nextFov)); // Clampar fov entre 30 y 100
          });
        }
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
    };
  }, [gamepadInfo, onClose]);

  // Reactivamente actualizar el FOV de la cámara de A-Frame para zoom instantáneo
  useEffect(() => {
    const cameraEl = document.querySelector('a-camera');
    if (cameraEl) {
      cameraEl.setAttribute('camera', 'fov', fov);
    }
  }, [fov]);

  // 2. Convertir coordenadas esféricas (pitch, yaw) a coordenadas cartesianas 3D (x, y, z)
  const getPositionFromPitchYaw = (pitch, yaw, radius = 3.5) => {
    const phi = (pitch * Math.PI) / 180;
    const theta = (yaw * Math.PI) / 180;

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
      let labelText = label ? label.toUpperCase().trim() : 'IR A HABITACIÓN';
      const needsPrefix = !labelText.startsWith('IR A') && 
                          !labelText.startsWith('REGRESAR A') && 
                          !labelText.startsWith('ENTRAR A') && 
                          !labelText.startsWith('VOLVER A');
      if (needsPrefix && label) {
        labelText = `IR A: ${labelText}`;
      }
      return {
        ...h,
        label: labelText,
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
            <h3><VRIcon size={26} style={{ color: '#3b82f6' }} /> Instrucciones de Recorrido VR</h3>
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
                  <strong>Joystick / Palanca:</strong>
                  <br />• Empuja hacia **arriba / abajo** para hacer **Zoom (Acercar / Alejar)**.
                  <br />• Mueve hacia los **lados (izquierda / derecha)** para **girar la cámara** cómodamente sin torcer tu cuello.
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
                <VRIcon size={18} style={{ color: '#fff', marginRight: '8px' }} />
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

      {/* Escena VR en A-Frame */}
      <a-scene 
        embedded 
        cursor="rayOrigin: mouse; fuse: false"
        style={{ width: '100vw', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 1000 }}
      >
        <a-assets>
          {/* Pre-cargar todos los panoramas para transiciones instantáneas y evitar pantallas blancas */}
          {panoramas.map((pano) => (
            <img
              key={`pano-asset-${pano.id}`}
              id={`pano-${pano.id}`}
              src={pano.archivo}
              crossOrigin={pano.archivo?.startsWith('blob:') ? undefined : 'anonymous'}
              alt={pano.descripcion}
            />
          ))}
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

            <a-entity position="0 0.5 0" rotation="0 0 0">
              <a-plane
                width="1.8"
                height="0.4"
                color="#0f172a"
                material="opacity: 0.8; shader: flat; transparent: true"
              ></a-plane>
              <a-text
                value={h.label}
                align="center"
                color="#ffffff"
                width="4.2"
                position="0 0 0.02"
              ></a-text>
            </a-entity>
          </a-entity>
        ))}

        {/* Rig de la Cámara para rotación artificial del mando y fov para zoom */}
        <a-entity id="camera-rig" rotation={`0 ${rigRotation} 0`}>
          <a-camera fov={fov} look-controls="magicWindowTrackingEnabled: true; touchEnabled: true; mouseEnabled: true" wasd-controls="enabled: false">
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
        </a-entity>
      </a-scene>
    </div>
  );
};

export default VisorVRGlasses;
