import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw, 
  Compass, 
  Radio,
  HelpCircle
} from 'lucide-react';
import api from '../services/api';

/**
 * ControladorVoz360 — Guía Turístico Virtual con Voz para Recorridos e Imágenes 360°.
 * 
 * Capacidades:
 * 1. Tour narrado automático con rotación esférica de cámara hacia puntos de interés.
 * 2. Asistente espacial reactivo por voz para medidas, distribución, precios y orientación.
 * 3. Cinemática local (0ms) para giros ("gira a la derecha", "acércate", "mira al techo").
 * 4. Audio Ducking para atenuar música ambiental mientras el guía o el usuario hablan.
 */
const ControladorVoz360 = ({ 
  viewerRef, 
  inmuebleId, 
  fotoActualUrl = null, 
  onCambiarEscena = null, 
  panoramas = [],
  audioBackgroundRef = null 
}) => {
  const [escuchando, setEscuchando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [vozActiva, setVozActiva] = useState(true);
  const [ultimoComando, setUltimoComando] = useState('');
  const [mensajeEstado, setMensajeEstado] = useState('Presiona "Iniciar Tour Narrado" o habla al micrófono...');
  const [dimensionesActuales, setDimensionesActuales] = useState(null);

  // Estados del Tour Narrado Automático
  const [tourActivo, setTourActivo] = useState(false);
  const [pasoTourActual, setPasoTourActual] = useState(0);
  const [totalPasosTour, setTotalPasosTour] = useState(0);
  const [tourData, setTourData] = useState(null);

  const recognitionRef = useRef(null);
  const tourTimeoutRef = useRef(null);
  const isSpeakingRef = useRef(false);

  // ─── Control de Volumen Musical (Audio Ducking) ───────────────────────────
  const atenuarMusica = () => {
    if (audioBackgroundRef?.current) {
      audioBackgroundRef.current.volume = 0.15;
    }
  };

  const restaurarMusica = () => {
    if (audioBackgroundRef?.current) {
      audioBackgroundRef.current.volume = 1.0;
    }
  };

  // ─── Síntesis de Voz en Voz Alta (Text-to-Speech) ──────────────────────────
  const hablarEnVozAlta = useCallback((texto, onEndCallback = null) => {
    if (!vozActiva || !window.speechSynthesis) {
      if (onEndCallback) onEndCallback();
      return;
    }

    atenuarMusica();
    window.speechSynthesis.cancel(); // Cancelar locución previa
    isSpeakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-ES';
    utterance.rate = 1.02;
    utterance.pitch = 1.0;

    // Buscar una voz nativa en español de alta calidad
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Monica') || v.name.includes('Jorge'))) || voices.find(v => v.lang.startsWith('es'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => {
      isSpeakingRef.current = false;
      restaurarMusica();
      if (onEndCallback) onEndCallback();
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      restaurarMusica();
      if (onEndCallback) onEndCallback();
    };

    window.speechSynthesis.speak(utterance);
  }, [vozActiva]);

  // ─── Reconocimiento de Voz (STT) ──────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setEscuchando(true);
        atenuarMusica();
        setMensajeEstado('Te escucho con atención...');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUltimoComando(transcript);
        procesarComandoDeVoz(transcript);
      };

      recognition.onerror = (e) => {
        console.error('Error en reconocimiento de voz:', e);
        setEscuchando(false);
        restaurarMusica();
        setMensajeEstado('No alcancé a escucharte bien. Vuelve a tocar el micrófono.');
      };

      recognition.onend = () => {
        setEscuchando(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      clearTimeout(tourTimeoutRef.current);
    };
  }, [vozActiva, hablarEnVozAlta]);

  const toggleMicrofono = () => {
    if (!recognitionRef.current) {
      alert('Tu navegador no soporta captura directa de micrófono.');
      return;
    }

    if (escuchando) {
      recognitionRef.current.stop();
    } else {
      // Si el tour automático estaba corriendo, pausarlo suavemente para atender la pregunta
      if (tourActivo) {
        clearTimeout(tourTimeoutRef.current);
        window.speechSynthesis?.cancel();
      }
      setDimensionesActuales(null);
      recognitionRef.current.start();
    }
  };

  // ─── Cinemática de Cámara Local (0ms de latencia) ────────────────────────
  const ejecutarComandoCamaraLocal = (texto) => {
    const t = texto.toLowerCase().trim();
    const v = viewerRef?.current;
    if (!v) return false;

    // Zoom In
    if (t.includes('acerca') || t.includes('zoom') || t.includes('adelante') || t.includes('mas cerca')) {
      const currentHfov = v.getHfov ? v.getHfov() : 100;
      const targetHfov = Math.max(40, currentHfov - 30);
      if (v.setHfov) v.setHfov(targetHfov, 600);
      const msg = 'Acercando vista';
      setMensajeEstado(msg);
      hablarEnVozAlta(msg);
      return true;
    }

    // Zoom Out
    if (t.includes('aleja') || t.includes('atras') || t.includes('mas lejos') || t.includes('panoramica') || t.includes('abrir')) {
      const currentHfov = v.getHfov ? v.getHfov() : 70;
      const targetHfov = Math.min(120, currentHfov + 30);
      if (v.setHfov) v.setHfov(targetHfov, 600);
      const msg = 'Alejando vista';
      setMensajeEstado(msg);
      hablarEnVozAlta(msg);
      return true;
    }

    // Gira Izquierda
    if (t.includes('izquierda') || t.includes('izq')) {
      const currentYaw = v.getYaw ? v.getYaw() : 0;
      if (v.setYaw) v.setYaw(currentYaw - 45, 600);
      const msg = 'Girando a la izquierda';
      setMensajeEstado(msg);
      hablarEnVozAlta(msg);
      return true;
    }

    // Gira Derecha
    if (t.includes('derecha') || t.includes('der')) {
      const currentYaw = v.getYaw ? v.getYaw() : 0;
      if (v.setYaw) v.setYaw(currentYaw + 45, 600);
      const msg = 'Girando a la derecha';
      setMensajeEstado(msg);
      hablarEnVozAlta(msg);
      return true;
    }

    // Mira Techo
    if (t.includes('arriba') || t.includes('techo') || t.includes('cielo')) {
      if (v.setPitch) v.setPitch(40, 600);
      const msg = 'Enfocando el techo';
      setMensajeEstado(msg);
      hablarEnVozAlta(msg);
      return true;
    }

    // Mira Suelo
    if (t.includes('abajo') || t.includes('piso') || t.includes('suelo')) {
      if (v.setPitch) v.setPitch(-40, 600);
      const msg = 'Enfocando el piso';
      setMensajeEstado(msg);
      hablarEnVozAlta(msg);
      return true;
    }

    // Resetear
    if (t.includes('centrar') || t.includes('restablecer') || t.includes('reiniciar') || t.includes('medio')) {
      if (v.lookAt) {
        v.lookAt(0, 0, 100, 600);
      } else {
        if (v.setPitch) v.setPitch(0, 600);
        if (v.setYaw) v.setYaw(0, 600);
        if (v.setHfov) v.setHfov(100, 600);
      }
      const msg = 'Vista centrada';
      setMensajeEstado(msg);
      hablarEnVozAlta(msg);
      return true;
    }

    return false;
  };

  // ─── Procesar Consultas por Voz o Botones Rápidos ────────────────────────
  const procesarComandoDeVoz = async (textoHablado) => {
    const txt = textoHablado.trim();
    if (!txt) return;

    if (ejecutarComandoCamaraLocal(txt)) return;

    setProcesando(true);
    setMensajeEstado('El guía está analizando tu consulta...');

    try {
      const res = await api.post('/inmuebles/asistente-espacial/consultar/', {
        consulta: txt,
        inmueble: inmuebleId,
        foto_360_url: fotoActualUrl
      });

      const data = res.data;
      setMensajeEstado(data.respuesta);
      setDimensionesActuales(data.dimensiones || null);

      hablarEnVozAlta(data.respuesta);

      // Si el motor semántico devuelve coordenadas esféricas, reorientamos la cámara
      if (data.camara_360 && viewerRef?.current) {
        const v = viewerRef.current;
        const { yaw, pitch, hfov } = data.camara_360;
        if (v.lookAt) {
          v.lookAt(pitch, yaw, hfov || 80, 1200);
        } else {
          if (v.setYaw) v.setYaw(yaw, 800);
          if (v.setPitch) v.setPitch(pitch, 800);
          if (v.setHfov && hfov) v.setHfov(hfov, 800);
        }
      }
    } catch (err) {
      console.error('Error consultando al guía virtual:', err);
      const errMsg = 'Disculpa, no pude procesar la consulta en este momento.';
      setMensajeEstado(errMsg);
      hablarEnVozAlta(errMsg);
    } finally {
      setProcesando(false);
    }
  };

  // ─── Flujo de Tour Narrado Automático ────────────────────────────────────
  const ejecutarPasoTour = useCallback((pasos, index) => {
    if (index >= pasos.length) {
      setTourActivo(false);
      setPasoTourActual(0);
      return;
    }

    const paso = pasos[index];
    setPasoTourActual(index + 1);
    setMensajeEstado(`[Paso ${index + 1}/${pasos.length}] ${paso.titulo}: "${paso.locucion}"`);

    // Rotar cámara hacia el punto destacado de esta parada
    if (paso.camara_360 && viewerRef?.current) {
      const v = viewerRef.current;
      const { yaw, pitch, hfov } = paso.camara_360;
      if (v.lookAt) {
        v.lookAt(pitch, yaw, hfov || 90, 1200);
      }
    }

    // Narrar la locución del paso y continuar con el siguiente
    hablarEnVozAlta(paso.locucion, () => {
      tourTimeoutRef.current = setTimeout(() => {
        ejecutarPasoTour(pasos, index + 1);
      }, 1000);
    });
  }, [viewerRef, hablarEnVozAlta]);

  const iniciarTourGuiado = async () => {
    try {
      setTourActivo(true);
      setMensajeEstado('Iniciando experiencia de guía turístico virtual...');

      const res = await api.post('/inmuebles/asistente-espacial/iniciar-tour/', {
        inmueble: inmuebleId,
        foto_360_url: fotoActualUrl
      });

      const pasos = res.data.pasos || [];
      setTourData(res.data);
      setTotalPasosTour(pasos.length);

      if (pasos.length > 0) {
        ejecutarPasoTour(pasos, 0);
      }
    } catch (err) {
      console.error('Error al iniciar tour guiado:', err);
      setTourActivo(false);
      setMensajeEstado('No se pudo cargar el tour en este momento.');
    }
  };

  const detenerTourGuiado = () => {
    clearTimeout(tourTimeoutRef.current);
    window.speechSynthesis?.cancel();
    restaurarMusica();
    setTourActivo(false);
    setPasoTourActual(0);
    setMensajeEstado('Tour narrado pausado. Puedes continuar explorando a tu propio ritmo.');
  };

  return (
    <div style={{
      marginTop: '14px',
      background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)',
      border: '1px solid #334155',
      borderRadius: '16px',
      padding: '16px 20px',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
    }}>
      {/* Cabecera del Guía Turístico */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '8px', borderRadius: '10px' }}>
            <Compass size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.96rem', fontWeight: 'bold', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Guía Turístico Virtual con Voz 360°
              <span style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600 }}>
                {tourActivo ? `Tour Activo (${pasoTourActual}/${totalPasosTour})` : 'Interactivo'}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Bienvenida, tour narrado y respuestas en tiempo real con orientación de cámara 360°
            </div>
          </div>
        </div>

        {/* Interruptor de Audio en Voz Alta */}
        <button
          onClick={() => setVozActiva(!vozActiva)}
          title={vozActiva ? 'Silenciar narrador' : 'Activar narrador'}
          style={{
            background: vozActiva ? 'rgba(14,165,233,0.15)' : '#1e293b',
            border: `1px solid ${vozActiva ? '#38bdf8' : '#475569'}`,
            color: vozActiva ? '#38bdf8' : '#94a3b8',
            padding: '6px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          {vozActiva ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>{vozActiva ? 'Narrador Activo' : 'En Silencio'}</span>
        </button>
      </div>

      {/* Botonera de Acción Principal: Iniciar Tour y Hablar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Botón de Tour Narrado */}
        <button
          onClick={tourActivo ? detenerTourGuiado : iniciarTourGuiado}
          style={{
            background: tourActivo
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            border: 'none',
            color: 'white',
            padding: '10px 18px',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            boxShadow: tourActivo ? '0 0 16px rgba(245, 158, 11, 0.4)' : '0 4px 12px rgba(2, 132, 199, 0.4)',
            transition: 'all 0.25s ease'
          }}
        >
          {tourActivo ? <Pause size={18} /> : <Play size={18} />}
          <span>{tourActivo ? 'Pausar Tour Narrado' : 'Iniciar Tour Narrado con Voz'}</span>
        </button>

        {/* Botón de Micrófono para Preguntas Espaciales */}
        <button
          onClick={toggleMicrofono}
          style={{
            background: escuchando 
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
              : '#1e293b',
            border: `1px solid ${escuchando ? '#ef4444' : '#475569'}`,
            color: 'white',
            padding: '10px 18px',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            boxShadow: escuchando ? '0 0 16px rgba(239, 68, 68, 0.5)' : 'none',
            transition: 'all 0.25s ease'
          }}
        >
          {escuchando ? <MicOff size={18} /> : <Mic size={18} />}
          <span>{escuchando ? 'Escuchando...' : 'Hacer Pregunta por Voz'}</span>
        </button>

        {ultimoComando && (
          <div style={{ fontSize: '0.82rem', color: '#cbd5e1', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={14} color="#38bdf8" />
            <span>"{ultimoComando}"</span>
          </div>
        )}
      </div>

      {/* Sugerencias Rápidas de Preguntas */}
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          '¿Cuánto mide la puerta?',
          '¿Cuánto mide la ventana?',
          '¿Cuánto es el largo del patio?',
          '¿Cabe refrigerador de 90 cm?',
          'Gira hacia la derecha',
          'Enfoca el techo'
        ].map((pregunta, idx) => (
          <button
            key={idx}
            onClick={() => procesarComandoDeVoz(pregunta)}
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#cbd5e1',
              padding: '4px 10px',
              borderRadius: '16px',
              fontSize: '0.74rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#38bdf8'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)'}
          >
            {pregunta}
          </button>
        ))}
      </div>

      {/* Tarjeta de Locución y Dimensiones */}
      <div style={{
        marginTop: '12px',
        padding: '12px 16px',
        background: 'rgba(14,165,233,0.08)',
        border: '1px solid rgba(56,189,248,0.3)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc', fontSize: '0.88rem', flex: 1 }}>
          <Volume2 size={18} color="#38bdf8" />
          <span>{mensajeEstado}</span>
        </div>

        {dimensionesActuales && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {dimensionesActuales.alto_m && (
              <span style={{ background: '#1e293b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', color: '#f8fafc', border: '1px solid #334155' }}>
                Alto: {dimensionesActuales.alto_m} m
              </span>
            )}
            {dimensionesActuales.ancho_m && (
              <span style={{ background: '#1e293b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', color: '#f8fafc', border: '1px solid #334155' }}>
                Ancho: {dimensionesActuales.ancho_m} m
              </span>
            )}
            {dimensionesActuales.largo_m && (
              <span style={{ background: '#1e293b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', color: '#f8fafc', border: '1px solid #334155' }}>
                Largo: {dimensionesActuales.largo_m} m
              </span>
            )}
            {dimensionesActuales.area_m2 && (
              <span style={{ background: '#0284c7', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', color: 'white', fontWeight: 'bold' }}>
                Área: {dimensionesActuales.area_m2} m²
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ControladorVoz360;
