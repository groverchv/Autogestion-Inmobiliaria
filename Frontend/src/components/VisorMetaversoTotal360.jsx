import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Layers, 
  Ruler, 
  Footprints, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Compass, 
  Eye, 
  Maximize2, 
  Minimize2,
  Box,
  HelpCircle,
  Radio,
  Mic,
  MicOff,
  Loader2
} from 'lucide-react';
import 'pannellum/build/pannellum.css';
import 'pannellum';
import api from '../services/api';
import './ModalRecorrido3D.css';

/**
 * VisorMetaversoTotal360 — Súper Función Inmersiva Unificada.
 * 
 * FUSIONA EN UN SOLO HUB ESPACIAL:
 * 1. Visor 360° Multi-Scene equirrectangular (Pannellum & WebXR).
 * 2. Realidad Aumentada (RA): Cotas métricas en 3D flotantes sobre objetos.
 * 3. Guía Turístico Virtual con Voz & Tour Narrado cinemático con Audio Ducking.
 * 4. Capa Geoespacial AR del Barrio: Pines flotantes hacia colegios, clínicas y Walk Score.
 * 5. Asistente de consultas por voz (NLP / Reconocimiento de Voz en Tiempo Real).
 */
const VisorMetaversoTotal360 = ({ inmuebleId, onClose, musica = null }) => {
  const viewerRef = useRef(null);
  const viewerInstanceRef = useRef(null);
  const reintentoRef = useRef(false);

  // Estados de datos
  const [metaData, setMetaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [escenaActiva, setEscenaActiva] = useState(null);

  // Capas activas de Realidad Aumentada (HUD)
  const [capaCotasAR, setCapaCotasAR] = useState(true);
  const [capaGuiaVoz, setCapaGuiaVoz] = useState(true);

  // Estados del Guía Turístico Virtual con Voz y NLP
  const [tourActivo, setTourActivo] = useState(false);
  const [pasoTourIndex, setPasoTourIndex] = useState(0);
  const [locucionActual, setLocucionActual] = useState('Bienvenido al recorrido virtual. Toca el micrófono para preguntarme lo que quieras.');
  const [audioVozActivo, setAudioVozActivo] = useState(true);
  const [escuchandoVoz, setEscuchandoVoz] = useState(false);
  const [procesandoNLP, setProcesandoNLP] = useState(false);
  const [fuenteRespuesta, setFuenteRespuesta] = useState(null);
  const [sugerencias, setSugerencias] = useState([]);
  const [accionSugerida, setAccionSugerida] = useState(null);

  // Overlay AR de medición (línea de cota encendida por una pregunta)
  const arOverlayRef = useRef(null);
  const arOverlayTimerRef = useRef(null);
  const hudCanvasRef = useRef(null);

  const audioFondoRef = useRef(null);
  const tourTimerRef = useRef(null);
  const recognitionRef = useRef(null);


  // ─── Control de Audio Ducking ─────────────────────────────────────────────
  const atenuarMusica = () => {
    if (audioFondoRef.current) audioFondoRef.current.volume = 0.15;
  };
  const restaurarMusica = () => {
    if (audioFondoRef.current) audioFondoRef.current.volume = 1.0;
  };

  // ─── Síntesis de Voz ──────────────────────────────────────────────────────
  const hablarEnVozAlta = useCallback((texto, onEndCallback = null) => {
    if (!audioVozActivo || !window.speechSynthesis) {
      if (onEndCallback) onEndCallback();
      return;
    }

    atenuarMusica();
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-ES';
    utterance.rate = 1.02;

    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Neural'))) || voices.find(v => v.lang.startsWith('es'));
    if (spanishVoice) utterance.voice = spanishVoice;

    utterance.onend = () => {
      restaurarMusica();
      if (onEndCallback) onEndCallback();
    };
    utterance.onerror = () => {
      restaurarMusica();
      if (onEndCallback) onEndCallback();
    };

    window.speechSynthesis.speak(utterance);
  }, [audioVozActivo]);

  // ─── Reconocimiento de Voz Espacial y NLP (STT) ──────────────────────────
  const FUENTE_LABEL = {
    vision_ia: 'Según la imagen que estás viendo',
    datos_propiedad: 'Dato registrado de la propiedad',
    estimacion: 'Estimación aproximada',
    no_determinado: null,
  };

  const procesarConsultaVoz = useCallback(async (transcripcion) => {
    if (!transcripcion || transcripcion.trim().length === 0) return;
    setProcesandoNLP(true);
    setFuenteRespuesta(null);
    setLocucionActual(`Analizando con IA: "${transcripcion}"...`);

    try {
      let yawActual = null;
      let pitchActual = null;
      try {
        if (viewerInstanceRef.current?.getYaw) {
          yawActual = viewerInstanceRef.current.getYaw();
          pitchActual = viewerInstanceRef.current.getPitch();
        }
      } catch {}

      const res = await api.post('/inmuebles/asistente-espacial/consultar/', {
        consulta: transcripcion,
        inmueble: inmuebleId,
        foto_360_url: escenaActiva?.archivo || null,
        panorama_id: typeof escenaActiva?.id === 'number' ? escenaActiva.id : null,
        yaw: yawActual,
        pitch: pitchActual,
      });

      const data = res.data;
      if (data && data.respuesta) {
        setLocucionActual(data.respuesta);
        setFuenteRespuesta(FUENTE_LABEL[data.fuente] || null);
        setAccionSugerida(data.accion || null);
        if (Array.isArray(data.sugerencias) && data.sugerencias.length > 0) {
          setSugerencias(data.sugerencias);
        }

        // Si la IA nos devuelve orientación de cámara hacia el objeto
        if (data.camara_360 && viewerInstanceRef.current?.lookAt) {
          const { yaw, pitch, hfov } = data.camara_360;
          try {
            viewerInstanceRef.current.lookAt(pitch, yaw, hfov || 90, 1000);
          } catch {}
        }

        // Comandos de cámara relativos ("gira a la derecha", "acércate")
        if (data.camara_relativa && viewerInstanceRef.current) {
          const v = viewerInstanceRef.current;
          try {
            if (data.camara_relativa.zoom === 'in' && v.getHfov && v.setHfov) {
              v.setHfov(Math.max(40, v.getHfov() - 30), 600);
            } else if (data.camara_relativa.zoom === 'out' && v.getHfov && v.setHfov) {
              v.setHfov(Math.min(120, v.getHfov() + 30), 600);
            } else if (v.lookAt && v.getYaw && v.getPitch) {
              const nuevoYaw = v.getYaw() + (data.camara_relativa.dyaw || 0);
              const nuevoPitch = Math.max(-80, Math.min(80, v.getPitch() + (data.camara_relativa.dpitch || 0)));
              v.lookAt(nuevoPitch, nuevoYaw, null, 800);
            }
          } catch {}
        }

        // Overlay AR de medición: enciende la línea de cota sobre el objeto
        if (data.ar_overlay) {
          arOverlayRef.current = data.ar_overlay;
          clearTimeout(arOverlayTimerRef.current);
          arOverlayTimerRef.current = setTimeout(() => {
            arOverlayRef.current = null;
          }, (data.ar_overlay.duracion_s || 6) * 1000);
        }

        // Responder con voz en voz alta
        hablarEnVozAlta(data.respuesta);
      }
    } catch (e) {
      console.error("Error en consulta espacial NLP:", e);
      const fallback = "No pude procesar tu consulta en este momento. Intenta de nuevo o pregúntame por el precio y los datos de la propiedad.";
      setLocucionActual(fallback);
      hablarEnVozAlta(fallback);
    } finally {
      setProcesandoNLP(false);
    }
  }, [inmuebleId, escenaActiva, hablarEnVozAlta]);

  // ─── Carga de Datos del Metaverso (Endpoint Consolidado <50ms) ────────────
  useEffect(() => {
    let cancelado = false;

    const cargarMetaverso = async () => {
      try {
        const res = await api.get('/inmuebles/calidad-vida/metaverso-datos/', {
          params: { inmueble: inmuebleId }
        });
        if (cancelado) return;
        const data = res.data;
        setMetaData(data);
        const primerPano = data?.panoramas?.length > 0 ? data.panoramas[0] : null;
        setEscenaActiva(primerPano);
        if (Array.isArray(data?.sugerencias) && data.sugerencias.length > 0) {
          setSugerencias(data.sugerencias);
        } else if (primerPano?.sugerencias?.length > 0) {
          setSugerencias(primerPano.sugerencias);
        }
        // Si aún no hay cotas, el análisis espacial puede estar corriendo
        // en background: reintentar una vez a los ~18s sin recargar.
        if ((!data?.cotas_ar || data.cotas_ar.length === 0) && !reintentoRef.current) {
          reintentoRef.current = true;
          setTimeout(() => {
            if (!cancelado) cargarMetaverso();
          }, 18000);
        }
      } catch (e) {
        console.error('Error cargando metaverso-datos:', e);
        if (cancelado) return;
        setMetaData({ titulo: 'Recorrido Inmobiliario' });
        setEscenaActiva(null);
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    cargarMetaverso();
    return () => { cancelado = true; };
  }, [inmuebleId]);

  // Sugerencias contextuales al cambiar de ambiente
  useEffect(() => {
    if (escenaActiva?.sugerencias?.length > 0) {
      setSugerencias(escenaActiva.sugerencias);
    }
  }, [escenaActiva]);

  // Escape cierra el visor (accesibilidad por teclado)
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setEscuchandoVoz(true);
        atenuarMusica();
        setLocucionActual("Te escucho... Pregúntame sobre cualquier objeto, medidas o detalles.");
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        procesarConsultaVoz(transcript);
      };

      recognition.onerror = (e) => {
        console.error("Error en captura de voz:", e);
        setEscuchandoVoz(false);
        restaurarMusica();
        setLocucionActual("No pude escucharte bien. Toca el micrófono para intentarlo de nuevo.");
      };

      recognition.onend = () => {
        setEscuchandoVoz(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, [procesarConsultaVoz]);

  const toggleMicrofono = () => {
    if (!recognitionRef.current) {
      // Fallback para navegadores sin SpeechRecognition nativo
      const ejemplos = [
        '¿Qué se ve en esta habitación?',
        '¿Cuál es el precio?',
        '¿Cuántos dormitorios tiene?',
        '¿Qué muebles hay aquí?',
        '¿Cuánto mide la puerta?'
      ];
      const consulta = ejemplos[Math.floor(Math.random() * ejemplos.length)];
      procesarConsultaVoz(consulta);
      return;
    }

    if (escuchandoVoz) {
      try { recognitionRef.current.stop(); } catch {}
    } else {
      if (tourActivo) {
        clearTimeout(tourTimerRef.current);
        window.speechSynthesis?.cancel();
        setTourActivo(false);
      }
      try { recognitionRef.current.start(); } catch {}
    }
  };


  // ─── Inicialización de Pannellum con Overlays de AR ───────────────────────
  useEffect(() => {
    if (loading || !metaData || !viewerRef.current || !escenaActiva) return;

    if (viewerInstanceRef.current) {
      try { viewerInstanceRef.current.destroy(); } catch {}
      viewerInstanceRef.current = null;
    }

    // Construir Hotspots de navegación y Pines AR
    const hotspots = (escenaActiva.hotspots || []).map(h => ({
      pitch: h.pitch,
      yaw: h.yaw,
      type: 'scene',
      sceneId: `scene_${h.escena_destino}`,
      text: h.texto_ayuda || 'Ir a habitación'
    }));

    // Las cotas AR ya no van como hotspots de Pannellum: se dibujan como
    // líneas de medida reales sobre el objeto en el canvas HUD (efecto de
    // dibujo más abajo).

    // Los pines del barrio no se pintan sobre el panorama: el usuario
    // consulta los servicios cercanos preguntándole al asistente.

    try {
      const viewer = window.pannellum.viewer(viewerRef.current, {
        type: 'equirectangular',
        panorama: escenaActiva.archivo,
        autoLoad: true,
        crossOrigin: 'anonymous',
        compass: false,
        showZoomCtrl: false,
        showFullscreenCtrl: false,
        mouseZoom: true,
        draggable: true,
        hfov: 100,
        hotSpots: hotspots
      });

      viewerInstanceRef.current = viewer;
    } catch (e) {
      console.error("Error al inicializar Pannellum en Metaverso Total:", e);
    }

    return () => {
      if (viewerInstanceRef.current) {
        try { viewerInstanceRef.current.destroy(); } catch {}
        viewerInstanceRef.current = null;
      }
    };
  }, [loading, metaData, escenaActiva]);

  // ─── Canvas HUD "lentes inteligentes": líneas de cota sobre objetos ──────
  // Proyección esférica idéntica a la que Pannellum usa internamente para
  // posicionar hotspots (ver función Ca en pannellum.js).
  useEffect(() => {
    let raf;
    const rad = Math.PI / 180;

    const proyectar = (yaw, pitch, camYaw, camPitch, hfov, W, H) => {
      const sP = Math.sin(pitch * rad), cP = Math.cos(pitch * rad);
      const sC = Math.sin(camPitch * rad), cC = Math.cos(camPitch * rad);
      const dY = (camYaw - yaw) * rad;
      const l = Math.sin(dY), g = Math.cos(dY);
      const h = sP * sC + cP * g * cC;          // profundidad en vista
      if (h <= 0.08) return null;               // detrás de la cámara
      const k = Math.tan(hfov * rad / 2);
      return {
        x: W / 2 - (W / (2 * k)) * (l * cP) / h,
        y: H / 2 - (W / (2 * k)) * (sP * cC - cP * g * sC) / h,
        h,
      };
    };

    const dibujarEtiqueta = (ctx, x, y, texto, destacado) => {
      ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
      const wTxt = ctx.measureText(texto).width;
      const bx = x - wTxt / 2 - 7, by = y - 24, bw = wTxt + 14, bh = 18;
      ctx.fillStyle = destacado ? 'rgba(14,116,144,0.92)' : 'rgba(15,23,42,0.82)';
      ctx.strokeStyle = 'rgba(56,189,248,0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 5);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e2f4ff';
      ctx.fillText(texto, x - wTxt / 2, by + 13);
    };

    const dibujarCota = (ctx, c, destacado) => {
      const color = destacado ? '#7dd3fc' : '#38bdf8';
      const punteada = !destacado && c.confianza === 'baja';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = destacado ? 2 : 1.5;
      ctx.setLineDash(punteada ? [5, 4] : []);

      const tieneBBox = c.yaw0 != null && c.yaw1 != null && c.pitch1 != null;
      const etiqueta = c.valor || c.cota || '';
      const titulo = c.elemento ? `${c.elemento} ` : '';

      if (!tieneBBox) {
        // Cota cualitativa (análisis de visión sin bbox): punto + etiqueta
        const p = proyectar(c.yaw, c.pitch, cam.yaw, cam.pitch, hfov, W, H);
        if (p) {
          ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
          dibujarEtiqueta(ctx, p.x, p.y, `${titulo}${etiqueta}`.trim(), destacado);
        }
        ctx.setLineDash([]);
        return;
      }

      // Línea de cota en el borde superior del bbox (horizontal) o borde
      // derecho (vertical), con ticks en los extremos, estilo regla AR.
      const esVertical = c.tipo === 'vertical';
      const a = esVertical
        ? proyectar(c.yaw1, c.pitch0, cam.yaw, cam.pitch, hfov, W, H)
        : proyectar(c.yaw0, c.pitch1, cam.yaw, cam.pitch, hfov, W, H);
      const b = esVertical
        ? proyectar(c.yaw1, c.pitch1, cam.yaw, cam.pitch, hfov, W, H)
        : proyectar(c.yaw1, c.pitch1, cam.yaw, cam.pitch, hfov, W, H);
      if (!a || !b) { ctx.setLineDash([]); return; }
      if (Math.abs(b.x - a.x) > W * 0.8) { ctx.setLineDash([]); return; } // costura ±180°

      // Brackets en las 4 esquinas del bbox (solo destacado o confianza alta)
      if (destacado || c.confianza === 'alta') {
        const esq = [
          proyectar(c.yaw0, c.pitch1, cam.yaw, cam.pitch, hfov, W, H),
          proyectar(c.yaw1, c.pitch1, cam.yaw, cam.pitch, hfov, W, H),
          proyectar(c.yaw0, c.pitch0, cam.yaw, cam.pitch, hfov, W, H),
          proyectar(c.yaw1, c.pitch0, cam.yaw, cam.pitch, hfov, W, H),
        ];
        const L = 9;
        ctx.beginPath();
        for (const [i, e] of esq.entries()) {
          if (!e) continue;
          const sx = i % 2 === 0 ? 1 : -1;   // hacia adentro en x
          const sy = i < 2 ? 1 : -1;         // hacia adentro en y
          ctx.moveTo(e.x + sx * L, e.y); ctx.lineTo(e.x, e.y); ctx.lineTo(e.x, e.y + sy * L);
        }
        ctx.stroke();
      }

      // Línea de cota + ticks de extremo
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      const T = 7;
      const nx = esVertical ? T : 0, ny = esVertical ? 0 : T;
      ctx.moveTo(a.x - nx, a.y - ny); ctx.lineTo(a.x + nx, a.y + ny);
      ctx.moveTo(b.x - nx, b.y - ny); ctx.lineTo(b.x + nx, b.y + ny);
      ctx.stroke();
      ctx.setLineDash([]);

      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      dibujarEtiqueta(ctx, cx, esVertical ? cy + 20 : cy, `${titulo}${etiqueta}`.trim(), destacado);
    };

    let cam = { yaw: 0, pitch: 0 };
    let hfov = 100, W = 0, H = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = hudCanvasRef.current;
      const viewer = viewerInstanceRef.current;
      if (!canvas || !viewer?.getYaw) return;
      W = canvas.clientWidth; H = canvas.clientHeight;
      if (W === 0 || H === 0) return;
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      cam = { yaw: viewer.getYaw(), pitch: viewer.getPitch() };
      hfov = viewer.getHfov ? viewer.getHfov() : 100;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, W, H);

      if (capaCotasAR && metaData?.cotas_ar) {
        for (const c of metaData.cotas_ar) {
          if (c.panorama_id !== escenaActiva?.id) continue;
          dibujarCota(ctx, c, false);
        }
      }
      const ov = arOverlayRef.current;
      if (ov && (!ov.panorama_id || ov.panorama_id === escenaActiva?.id)) {
        dibujarCota(ctx, ov, true);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [metaData, escenaActiva, capaCotasAR]);

  // ─── Ejecutar Tour Narrado Cinemático Dinámico ─────────────────────────────
  const ejecutarPasoTour = useCallback((pasos, index) => {
    if (index >= pasos.length) {
      setTourActivo(false);
      setPasoTourIndex(0);
      setLocucionActual("Recorrido narrado finalizado. Explora libremente el espacio.");
      return;
    }

    const paso = pasos[index];
    setPasoTourIndex(index + 1);
    setLocucionActual(`[${index + 1}/${pasos.length}] ${paso.titulo}: "${paso.locucion}"`);

    // Cambiar de escena si el paso corresponde a otro panorama
    if (paso.panorama_id && metaData?.panoramas) {
      const targetPano = metaData.panoramas.find(p => p.id === paso.panorama_id);
      if (targetPano && targetPano.id !== escenaActiva?.id) {
        setEscenaActiva(targetPano);
      }
    }

    // Rotar cámara hacia el waypoint
    if (paso.camara_360 && viewerInstanceRef.current?.lookAt) {
      const { yaw, pitch, hfov } = paso.camara_360;
      setTimeout(() => {
        try {
          viewerInstanceRef.current?.lookAt(pitch, yaw, hfov || 95, 1200);
        } catch {}
      }, 300);
    }

    hablarEnVozAlta(paso.locucion, () => {
      tourTimerRef.current = setTimeout(() => {
        ejecutarPasoTour(pasos, index + 1);
      }, 1200);
    });
  }, [hablarEnVozAlta, metaData, escenaActiva]);


  const toggleTourNarrado = async () => {
    if (tourActivo) {
      clearTimeout(tourTimerRef.current);
      window.speechSynthesis?.cancel();
      restaurarMusica();
      setTourActivo(false);
      setLocucionActual("Recorrido pausado. Continúa navegando a tu ritmo.");
      return;
    }

    // Pedir el tour al backend: analiza las imágenes reales y cachea el
    // análisis; si falla, usamos el tour básico ya cargado.
    setLocucionActual("Preparando el recorrido guiado...");
    let pasos = [];
    try {
      const res = await api.post('/inmuebles/asistente-espacial/iniciar-tour/', {
        inmueble: inmuebleId,
        foto_360_url: escenaActiva?.archivo || null,
      });
      pasos = res.data?.pasos || [];
    } catch (e) {
      console.error('Error obteniendo tour:', e);
    }
    if (pasos.length === 0) {
      pasos = metaData?.tour_narrado?.pasos || [];
    }

    if (pasos.length > 0) {
      setTourActivo(true);
      ejecutarPasoTour(pasos, 0);
    } else {
      setLocucionActual("Esta propiedad aún no tiene ambientes para recorrer.");
    }
  };

  if (loading) {
    return (
      <div className="modal-recorrido__loader">
        <div className="modal-recorrido__loader-card">
          <div className="modal-recorrido__spinner"></div>
          <h3>Preparando el recorrido virtual...</h3>
          <p>Cargando las fotos 360° de la propiedad</p>
        </div>
      </div>
    );
  }

  const walkScore = metaData?.calidad_vida?.walk_score;
  const clasificacion = metaData?.calidad_vida?.clasificacion;

  return (
    <div
      className="modal-recorrido"
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#090d16' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Visor inmersivo 360° de ${metaData?.titulo || 'inmueble'}`}
    >
      
      {/* ─── HUD Superior Flotante de Realidad Aumentada ─── */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        right: '16px',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        pointerEvents: 'none'
      }}>
        {/* Título y Walk Score Badge */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '16px',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          pointerEvents: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Recorrido virtual
            </span>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', fontWeight: 700 }}>
              {metaData?.titulo || 'Recorrido de la propiedad'}
            </h3>
          </div>

          {walkScore != null && (
            <div style={{ borderLeft: '1px solid #334155', paddingLeft: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Footprints size={16} color="#10b981" />
              <div>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#10b981' }}>{walkScore}/100</span>
                <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8' }}>{clasificacion}</span>
              </div>
            </div>
          )}
        </div>

        {/* Botón Salir */}
        <div style={{ pointerEvents: 'auto' }}>
          <button
            onClick={onClose}
            aria-label="Salir del visor 360°"
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid #334155',
              color: 'white',
              padding: '10px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ─── Contenedor del Visor 360° ─── */}
      <div ref={viewerRef} style={{ width: '100vw', height: '100vh' }} id="metaverso-pannellum-viewer" />

      {/* Canvas HUD: líneas de cota AR estilo "lentes inteligentes" */}
      <canvas
        ref={hudCanvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 6 }}
      />

      {/* Estado vacío honesto: la propiedad no tiene panoramas reales */}
      {!escenaActiva && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '14px',
          background: '#090d16', zIndex: 5, padding: '24px', textAlign: 'center'
        }}>
          <Eye size={40} color="#475569" />
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem' }}>Esta propiedad aún no tiene recorrido 360°</h3>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem', maxWidth: '420px', lineHeight: 1.5 }}>
            Cuando el propietario suba fotos panorámicas podrás recorrer cada ambiente desde aquí.
            Mientras tanto, puedes preguntarme por el precio, los dormitorios y los datos de la publicación.
          </p>
        </div>
      )}

      {/* ─── Banner de Locución y Guía Virtual con Voz ─── */}
      {capaGuiaVoz && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '20px',
          right: '20px',
          zIndex: 10,
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '16px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div style={{ background: 'rgba(56,189,248,0.2)', padding: '8px', borderRadius: '10px', color: '#38bdf8' }}>
              <Volume2 size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>Tu guía del recorrido</span>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#f8fafc', fontWeight: 500, lineHeight: '1.4' }}>
                {locucionActual}
              </p>
              {fuenteRespuesta && (
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  {fuenteRespuesta}
                </span>
              )}
              {accionSugerida && (
                <button
                  onClick={() => { setAccionSugerida(null); onClose?.(); }}
                  style={{
                    marginTop: '6px', background: '#0284c7', border: 'none', color: 'white',
                    padding: '4px 12px', borderRadius: '10px', fontSize: '0.75rem',
                    fontWeight: 'bold', cursor: 'pointer'
                  }}
                >
                  {accionSugerida.etiqueta || 'Ir'}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={toggleTourNarrado}
              style={{
                background: tourActivo ? '#f59e0b' : '#0284c7',
                border: 'none',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {tourActivo ? <Pause size={16} /> : <Play size={16} />}
              <span>{tourActivo ? 'Pausar recorrido' : 'Iniciar recorrido guiado'}</span>
            </button>

            <button
              onClick={() => setAudioVozActivo(!audioVozActivo)}
              style={{
                background: '#1e293b',
                border: '1px solid #475569',
                color: audioVozActivo ? '#38bdf8' : '#94a3b8',
                padding: '8px 12px',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              {audioVozActivo ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>

          {/* Sugerencias dinámicas según el contexto real del ambiente */}
          {sugerencias.length > 0 && (
            <div style={{ width: '100%', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
              {sugerencias.map((pregunta, idx) => (
                <button
                  key={idx}
                  onClick={() => procesarConsultaVoz(pregunta)}
                  disabled={procesandoNLP}
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#cbd5e1',
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '0.74rem',
                    cursor: procesandoNLP ? 'default' : 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {pregunta}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Barra de Control de Capas AR (HUD Inferior) ─── */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid #334155',
        borderRadius: '24px',
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
      }}>
        {/* Toggle Cotas AR */}
        <button
          onClick={() => setCapaCotasAR(!capaCotasAR)}
          style={{
            background: capaCotasAR ? 'rgba(56,189,248,0.2)' : 'transparent',
            border: `1px solid ${capaCotasAR ? '#38bdf8' : 'transparent'}`,
            color: capaCotasAR ? '#38bdf8' : '#94a3b8',
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Ruler size={14} />
          <span>Medidas (aprox.)</span>
        </button>

        {/* Los nombres del barrio ya no se pintan sobre el panorama;
            el asistente los responde por texto/voz cuando se pregunta */}

        {/* Selector de Habitaciones si hay más de 1 */}
        {metaData?.panoramas && metaData.panoramas.length > 1 && (
          <div style={{ borderLeft: '1px solid #334155', paddingLeft: '8px', display: 'flex', gap: '6px' }}>
            {metaData.panoramas.map(p => (
              <button
                key={p.id}
                onClick={() => setEscenaActiva(p)}
                style={{
                  background: escenaActiva?.id === p.id ? '#0284c7' : '#1e293b',
                  border: 'none',
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {p.descripcion || `Habitación ${p.id}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Botón Flotante de Asistente de Voz Espacial (Micrófono) ─── */}
      <button
        onClick={toggleMicrofono}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '24px',
          zIndex: 9999,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: escuchandoVoz ? '#ef4444' : '#0284c7',
          border: '2px solid rgba(255, 255, 255, 0.4)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: escuchandoVoz ? '0 0 25px rgba(239, 68, 68, 0.8)' : '0 8px 25px rgba(2, 132, 199, 0.5)',
          transition: 'all 0.3s ease'
        }}
        title={escuchandoVoz ? 'Escuchando tu voz... (toca para pausar)' : 'Toca y habla al Asistente Espacial'}
      >
        {procesandoNLP ? (
          <Loader2 size={24} className="animate-spin" />
        ) : escuchandoVoz ? (
          <MicOff size={24} />
        ) : (
          <Mic size={24} />
        )}
      </button>


      {/* Estilos CSS Inline para Pines de Realidad Aumentada sobre Pannellum */}
      <style>{`
        .pnlm-cota-ar-pin .cota-badge {
          background: rgba(2, 132, 199, 0.9);
          border: 1.5px solid #38bdf8;
          color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.72rem;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.5);
          white-space: nowrap;
        }
        .pnlm-barrio-ar-pin .barrio-badge {
          background: rgba(15, 23, 42, 0.95);
          border: 1.5px solid #10b981;
          color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.72rem;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};

export default VisorMetaversoTotal360;
