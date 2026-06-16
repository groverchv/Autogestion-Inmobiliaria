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
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [gamepadName, setGamepadName] = useState('');
  const [pantallaDoble, setPantallaDoble] = useState(false);
  const [gyroPermission, setGyroPermission] = useState('unknown');
  const [mostrarInstrucciones, setMostrarInstrucciones] = useState(true);

  // ─── Refs para control del joystick (sin re-renders por frame) ────────────
  // Almacenamos rotación y fov en refs para actualizarlos imperativamente en A-Frame
  const rigRotationRef = useRef(0);
  const fovRef = useRef(80);

  const sensorInicializado = useRef(false);
  const escenaActivaRef = useRef(escenaActiva);
  const panoramasRef = useRef(panoramas);
  const onCloseRef = useRef(onClose);
  // Ref para detectar swipes táctiles del mando (algunos mandos BT emulan touch)
  const touchStartRef = useRef(null);

  useEffect(() => { escenaActivaRef.current = escenaActiva; }, [escenaActiva]);
  useEffect(() => { panoramasRef.current = panoramas; }, [panoramas]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
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
          if (!silencioso) alert('¡Permiso de sensor de movimiento concedido!');
        } else {
          if (!silencioso) alert('Permiso de giroscopio denegado.');
        }
      } catch (err) {
        console.error('Error al solicitar permiso de giroscopio:', err);
        if (!silencioso) alert('Error al solicitar permiso: ' + err.message);
      }
    } else {
      setGyroPermission('granted');
      reloadLookControls();
      sensorInicializado.current = true;
      if (!silencioso) alert('El sensor de movimiento ya está activo y soportado.');
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

  // ─── Helpers para controles ───────────────────────────────────────────────

  /** Aplica la rotación actual del rig al elemento A-Frame de forma imperativa */
  const applyRigRotation = (newRot) => {
    rigRotationRef.current = newRot;
    const rig = document.getElementById('camera-rig');
    if (rig) {
      rig.setAttribute('rotation', `0 ${newRot} 0`);
    }
  };

  /** Aplica el FOV actual a la cámara A-Frame de forma imperativa */
  const applyFov = (newFov) => {
    fovRef.current = newFov;
    const cameraEl = document.querySelector('a-camera');
    if (cameraEl) {
      cameraEl.setAttribute('camera', 'fov', newFov);
    }
  };

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

  // ─── Escucha de teclado (keyboard / multimedia buttons) ───────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;
      const keyLower = key?.toLowerCase();

      if (key === '@' || keyLower === '@') {
        e.preventDefault();
        triggerActiveHotspot();
        return;
      }
      if (keyLower === 'a') { e.preventDefault(); goToNextRoom(); return; }
      if (keyLower === 'b') { e.preventDefault(); goToPrevRoom(); return; }

      // Teclado: flechas como fallback (el joystick analógico usa el Gamepad API)
      if (key === 'ArrowRight') {
        e.preventDefault();
        applyRigRotation((rigRotationRef.current + 5) % 360);
      }
      if (key === 'ArrowLeft') {
        e.preventDefault();
        applyRigRotation((rigRotationRef.current - 5 + 360) % 360);
      }
      if (key === 'ArrowUp') {
        e.preventDefault();
        applyFov(Math.max(30, fovRef.current - 2)); // Zoom in (imagen más grande)
      }
      if (key === 'ArrowDown') {
        e.preventDefault();
        applyFov(Math.min(100, fovRef.current + 2)); // Zoom out (imagen más pequeña)
      }
      // NOTA: VolumeUp/VolumeDown NO se interceptan aquí porque Windows cambia el
      // volumen del sistema sin importar e.preventDefault(). El zoom del joystick
      // se maneja exclusivamente por el Gamepad API (ejes analógicos).

      if (key === ' ' || key === 'Enter' || key === 'Trigger' || key === 'Select' || key === 'MediaPlayPause') {
        e.preventDefault();
        triggerActiveHotspot();
      }

      if (key === 'Escape' || key === 'Backspace' || keyLower === 'q') {
        e.preventDefault();
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // sin dependencias: usa refs para todo

  // ─── Interceptar teclas de volumen del mando (móvil Android / iOS) ──────────
  // Muchos mandos Bluetooth VR en Android envían VolumeUp/VolumeDown cuando se
  // mueve el joystick en el eje Y. Con useCapture:true + stopImmediatePropagation
  // interceptamos el evento antes de que Android cambie el volumen del sistema.
  useEffect(() => {
    const handleVolumeKey = (e) => {
      if (e.key === 'VolumeUp' || e.key === 'AudioVolumeUp') {
        e.preventDefault();
        e.stopImmediatePropagation();
        // Joystick adelante / arriba → Zoom IN (imagen más grande)
        applyFov(Math.max(30, fovRef.current - 3));
      }
      if (e.key === 'VolumeDown' || e.key === 'AudioVolumeDown') {
        e.preventDefault();
        e.stopImmediatePropagation();
        // Joystick atrás / abajo → Zoom OUT (imagen más pequeña)
        applyFov(Math.min(100, fovRef.current + 3));
      }
    };

    // useCapture: true → captura temprana antes que Android procese el volumen
    window.addEventListener('keydown', handleVolumeKey, true);
    document.addEventListener('keydown', handleVolumeKey, true);
    return () => {
      window.removeEventListener('keydown', handleVolumeKey, true);
      document.removeEventListener('keydown', handleVolumeKey, true);
    };
  }, []);

  // ─── Swipe táctil para mandos que emulan toque de pantalla ───────────────
  // Algunos mandos VR baratos en Android emulan un swipe en la pantalla del teléfono.
  // Swipe vertical → Zoom | Swipe horizontal → Rotar cámara
  useEffect(() => {
    const SWIPE_THRESHOLD = 10; // px mínimos para considerar swipe
    const ZOOM_SENSITIVITY = 0.15; // menor número = más suave
    const ROT_SENSITIVITY = 0.3;

    const onTouchStart = (e) => {
      // Solo guardamos si es un único toque (el mando suele enviar 1 dedo)
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const onTouchMove = (e) => {
      if (!touchStartRef.current || e.touches.length !== 1) return;

      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;

      // Decidir si el swipe es más horizontal o más vertical
      if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(dy) > SWIPE_THRESHOLD) {
        if (Math.abs(dy) > Math.abs(dx)) {
          // Swipe vertical → Zoom
          // Hacia arriba (dy negativo) = imagen más grande (Zoom IN)
          const newFov = Math.max(30, Math.min(100, fovRef.current + dy * ZOOM_SENSITIVITY));
          applyFov(newFov);
        } else {
          // Swipe horizontal → Rotar cámara
          // Hacia la derecha (dx positivo) = girar a la derecha
          const newRot = ((rigRotationRef.current - dx * ROT_SENSITIVITY) % 360 + 360) % 360;
          applyRigRotation(newRot);
        }
        // Actualizar el punto de inicio para que el movimiento sea continuo
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const onTouchEnd = () => {
      touchStartRef.current = null;
    };

    // Usamos passive:false para poder llamar preventDefault si hace falta
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // ─── Polling de Gamepad API ───────────────────────────────────────────────
  // IMPORTANTE: sin dependencias de estado para no reiniciar el loop cada frame.
  useEffect(() => {
    let rafId;
    let lastButtonStates = {};
    let prevConnected = false;

    const DEADZONE = 0.18; // zona muerta del stick analógico
    const ROT_SPEED = 2.0;  // grados por frame (velocidad de giro)
    const FOV_SPEED = 0.6;  // grados por frame (velocidad de zoom)

    const checkGamepads = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let activeGamepad = null;

      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) { activeGamepad = gamepads[i]; break; }
      }

      if (activeGamepad) {
        // Notificar conexión (solo cuando cambia)
        if (!prevConnected || gamepadName !== activeGamepad.id) {
          prevConnected = true;
          setGamepadConnected(true);
          setGamepadName(activeGamepad.id);
        }

        // ── Botones ────────────────────────────────────────────────────────
        activeGamepad.buttons.forEach((btn, index) => {
          const pressed = btn.pressed || btn.value > 0.5;
          const wasPressed = lastButtonStates[index] || false;

          if (pressed && !wasPressed) {
            if (index === 0) {
              goToNextRoom();       // Botón A → Siguiente habitación
            } else if (index === 1) {
              goToPrevRoom();       // Botón B → Habitación anterior
            } else {
              triggerActiveHotspot(); // @ / Trigger → Seleccionar hotspot
            }
          }
          lastButtonStates[index] = pressed;
        });

        // ── Joystick analógico ─────────────────────────────────────────────
        // Búsqueda robusta: primero ejes 0,1; luego 2,3; luego cualquier eje activo
        let axisX = 0;
        let axisY = 0;

        if (activeGamepad.axes.length >= 2) {
          axisX = activeGamepad.axes[0];
          axisY = activeGamepad.axes[1];
        }

        // Si el stick principal no tiene señal, probar stick secundario (ejes 2,3)
        if (Math.abs(axisX) < 0.05 && Math.abs(axisY) < 0.05 && activeGamepad.axes.length >= 4) {
          axisX = activeGamepad.axes[2];
          axisY = activeGamepad.axes[3];
        }

        // Fallback: buscar en cualquier eje con señal
        if (Math.abs(axisX) < 0.05 && Math.abs(axisY) < 0.05) {
          for (let j = 0; j < activeGamepad.axes.length; j++) {
            const val = activeGamepad.axes[j];
            if (Math.abs(val) > DEADZONE) {
              if (j % 2 === 0) axisX = val;
              else axisY = val;
            }
          }
        }

        // Giro horizontal: stick izquierda/derecha → rotar cámara
        if (Math.abs(axisX) > DEADZONE) {
          // Aplicar curva cuadrática para mayor precisión en movimientos suaves
          const sign = axisX > 0 ? 1 : -1;
          const magnitude = axisX * axisX * sign; // curva cuadrática
          let newRot = rigRotationRef.current - magnitude * ROT_SPEED;
          newRot = ((newRot % 360) + 360) % 360;
          applyRigRotation(newRot);
        }

        // Zoom: stick arriba/abajo → ajustar FOV
        if (Math.abs(axisY) > DEADZONE) {
          const newFov = Math.max(30, Math.min(100, fovRef.current + axisY * FOV_SPEED));
          applyFov(newFov);
        }

      } else {
        // Sin gamepad conectado
        if (prevConnected) {
          prevConnected = false;
          setGamepadConnected(false);
          setGamepadName('');
        }
      }

      rafId = requestAnimationFrame(checkGamepads);
    };

    rafId = requestAnimationFrame(checkGamepads);
    return () => cancelAnimationFrame(rafId);
  }, []); // ← sin dependencias: usa refs y setters de estado (estables)

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
                  <strong>Joystick / Palanca analógica:</strong>
                  <br />• Mueve hacia <strong>izquierda / derecha</strong> para <strong>girar la cámara</strong> suavemente.
                  <br />• Mueve hacia <strong>arriba / abajo</strong> para <strong>Zoom (Acercar / Alejar)</strong>.
                </div>
              </div>
            </div>

            <div className="instructions-actions">
              <button 
                className="start-vr-btn"
                onClick={() => {
                  setMostrarInstrucciones(false);
                  togglePantallaDoble(true);
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

      {/* 2. Cabecera de controles flotantes */}
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

            <button
              className="visor-vr-glasses__close-btn"
              onClick={toggleOrientacion}
              title="Cambiar orientación de pantalla"
              type="button"
            >
              <Smartphone size={16} />
              <span>Girar Pantalla</span>
            </button>

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

            {/* Indicador de gamepad conectado */}
            {gamepadConnected && (
              <span
                className="visor-vr-glasses__close-btn"
                style={{ background: '#10b981', color: '#fff', borderColor: '#059669', cursor: 'default', fontSize: '0.75rem' }}
                title={`Mando conectado: ${gamepadName}`}
              >
                <Gamepad size={16} />
                <span>Mando ✓</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Selector de Habitaciones */}
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

        {/* Rig de la Cámara — la rotación se controla imperativamente vía setAttribute */}
        <a-entity id="camera-rig" rotation="0 0 0">
          <a-camera
            fov="80"
            look-controls="magicWindowTrackingEnabled: true; touchEnabled: true; mouseEnabled: true"
            wasd-controls="enabled: false"
          >
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
