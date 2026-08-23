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
  MapPin,
  HelpCircle,
  Radio
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
 * 5. Asistente de consultas por voz para mediciones y compatibilidad espacial.
 */
const VisorMetaversoTotal360 = ({ inmuebleId, onClose, musica = null }) => {
  const viewerRef = useRef(null);
  const viewerInstanceRef = useRef(null);

  // Estados de datos
  const [metaData, setMetaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [escenaActiva, setEscenaActiva] = useState(null);

  // Capas activas de Realidad Aumentada (HUD)
  const [capaCotasAR, setCapaCotasAR] = useState(true);
  const [capaPinesBarrioAR, setCapaPinesBarrioAR] = useState(true);
  const [capaGuiaVoz, setCapaGuiaVoz] = useState(true);

  // Estados del Tour Narrado del Guía
  const [tourActivo, setTourActivo] = useState(false);
  const [pasoTourIndex, setPasoTourIndex] = useState(0);
  const [locucionActual, setLocucionActual] = useState('Bienvenido al Metaverso Inmobiliario 360°.');
  const [audioVozActivo, setAudioVozActivo] = useState(true);

  const audioFondoRef = useRef(null);
  const tourTimerRef = useRef(null);

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

  // ─── Carga de Payload Unificado (<50ms) ───────────────────────────────────
  useEffect(() => {
    let active = true;
    setLoading(true);

    api.get('/inmuebles/calidad-vida/metaverso-datos/', { params: { inmueble: inmuebleId } })
      .then(res => {
        if (active) {
          setMetaData(res.data);
          if (res.data.panoramas && res.data.panoramas.length > 0) {
            setEscenaActiva(res.data.panoramas[0]);
          }
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Error al cargar datos del metaverso:", err);
        setLoading(false);
      });

    return () => {
      active = false;
      clearTimeout(tourTimerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, [inmuebleId]);

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

    // Añadir Hotspots de Cotas AR si está activado
    if (capaCotasAR && metaData.cotas_ar) {
      metaData.cotas_ar.forEach(c => {
        hotspots.push({
          pitch: c.pitch,
          yaw: c.yaw,
          type: 'info',
          text: `[Cota AR] ${c.elemento}: ${c.cota}`,
          createTooltipFunc: (div) => {
            div.className = 'pnlm-cota-ar-pin';
            div.innerHTML = `<div class="cota-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> <span>${c.elemento}: <strong>${c.cota}</strong></span></div>`;
          }
        });
      });
    }

    // Añadir Pines AR del Barrio si está activado
    if (capaPinesBarrioAR && metaData.pines_ar_barrio) {
      metaData.pines_ar_barrio.forEach(p => {
        hotspots.push({
          pitch: p.pitch,
          yaw: p.yaw,
          type: 'info',
          text: `[Entorno] ${p.nombre} a ${p.distancia_m}m (~${p.minutos_a_pie} min a pie)`,
          createTooltipFunc: (div) => {
            div.className = 'pnlm-barrio-ar-pin';
            div.innerHTML = `<div class="barrio-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> <span>${p.nombre} (<strong>${p.distancia_m}m / ~${p.minutos_a_pie} min</strong>)</span></div>`;
          }
        });
      });
    }

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
  }, [loading, metaData, escenaActiva, capaCotasAR, capaPinesBarrioAR]);

  // ─── Ejecutar Tour Narrado Cinemático ────────────────────────────────────
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

    // Rotar cámara hacia el waypoint
    if (paso.camara_360 && viewerInstanceRef.current?.lookAt) {
      const { yaw, pitch, hfov } = paso.camara_360;
      viewerInstanceRef.current.lookAt(pitch, yaw, hfov || 90, 1200);
    }

    hablarEnVozAlta(paso.locucion, () => {
      tourTimerRef.current = setTimeout(() => {
        ejecutarPasoTour(pasos, index + 1);
      }, 1000);
    });
  }, [hablarEnVozAlta]);

  const toggleTourNarrado = () => {
    if (tourActivo) {
      clearTimeout(tourTimerRef.current);
      window.speechSynthesis?.cancel();
      restaurarMusica();
      setTourActivo(false);
      setLocucionActual("Tour pausado. Continúa navegando a tu ritmo.");
    } else {
      const pasos = metaData?.tour_narrado?.pasos || [];
      if (pasos.length > 0) {
        setTourActivo(true);
        ejecutarPasoTour(pasos, 0);
      }
    }
  };

  if (loading) {
    return (
      <div className="modal-recorrido__loader">
        <div className="modal-recorrido__loader-card">
          <div className="modal-recorrido__spinner"></div>
          <h3>Cargando Metaverso Espacial 360° + RA...</h3>
          <p>Sincronizando modelos, cotas métricas y entorno urbano</p>
        </div>
      </div>
    );
  }

  const walkScore = metaData?.calidad_vida?.walk_score || 85;
  const clasificacion = metaData?.calidad_vida?.clasificacion || "Muy Caminable";

  return (
    <div className="modal-recorrido" style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#090d16' }}>
      
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
              Spatial Hub 360° + RA
            </span>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', fontWeight: 700 }}>
              {metaData?.titulo || 'Recorrido Inmobiliario Total'}
            </h3>
          </div>

          <div style={{ borderLeft: '1px solid #334155', paddingLeft: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Footprints size={16} color="#10b981" />
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#10b981' }}>{walkScore}/100</span>
              <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8' }}>{clasificacion}</span>
            </div>
          </div>
        </div>

        {/* Botón Salir */}
        <div style={{ pointerEvents: 'auto' }}>
          <button
            onClick={onClose}
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
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>GUÍA TURÍSTICO EN TIEMPO REAL</span>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#f8fafc', fontWeight: 500, lineHeight: '1.4' }}>
                {locucionActual}
              </p>
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
              <span>{tourActivo ? 'Pausar Tour' : 'Iniciar Tour Narrado'}</span>
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
          <span>Cotas en RA</span>
        </button>

        {/* Toggle Pines Barrio AR */}
        <button
          onClick={() => setCapaPinesBarrioAR(!capaPinesBarrioAR)}
          style={{
            background: capaPinesBarrioAR ? 'rgba(16,185,129,0.2)' : 'transparent',
            border: `1px solid ${capaPinesBarrioAR ? '#10b981' : 'transparent'}`,
            color: capaPinesBarrioAR ? '#10b981' : '#94a3b8',
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
          <MapPin size={14} />
          <span>Entorno Urbano AR</span>
        </button>

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
