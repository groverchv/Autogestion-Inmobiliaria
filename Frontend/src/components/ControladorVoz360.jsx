import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ZoomIn, 
  ZoomOut, 
  CheckCircle2,
  Radio
} from 'lucide-react';
import api from '../services/api';

const ControladorVoz360 = ({ viewerRef, inmuebleId, fotoActualUrl = null, onCambiarEscena, panoramas = [] }) => {
  const [escuchando, setEscuchando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [vozActiva, setVozActiva] = useState(true);
  const [ultimoComando, setUltimoComando] = useState('');
  const [mensajeEstado, setMensajeEstado] = useState('Presiona el micrófono y habla: "Acércate a la ventana", "¿Cuánto mide la puerta?", "Gira a la derecha"...');
  const [dimensionesActuales, setDimensionesActuales] = useState(null);
  
  const recognitionRef = useRef(null);

  // Síntesis de Voz en Voz Alta (Text-to-Speech)
  const hablarEnVozAlta = (texto) => {
    if (!vozActiva || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Detener audios previos
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Buscar una voz en español natural si está disponible
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith('es'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setEscuchando(true);
        setMensajeEstado('Escuchando tu voz en tiempo real...');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUltimoComando(transcript);
        procesarComandoDeVoz(transcript);
      };

      recognition.onerror = (e) => {
        console.error('Error de voz:', e);
        setEscuchando(false);
        setMensajeEstado('No se escuchó con claridad. Toca el micrófono para intentar de nuevo.');
      };

      recognition.onend = () => {
        setEscuchando(false);
      };

      recognitionRef.current = recognition;
    }
  }, [vozActiva]);

  const toggleMicrofono = () => {
    if (!recognitionRef.current) {
      alert('Tu navegador no soporta captura de micrófono.');
      return;
    }

    if (escuchando) {
      recognitionRef.current.stop();
    } else {
      window.speechSynthesis?.cancel();
      setDimensionesActuales(null);
      recognitionRef.current.start();
    }
  };

  // 1. Manejo instantáneo local (0ms) de comandos de cámara
  const ejecutarComandoCamaraLocal = (texto) => {
    const t = texto.toLowerCase().trim();
    const v = viewerRef?.current;
    if (!v) return false;

    // Zoom In / Acercar
    if (t.includes('acerca') || t.includes('zoom') || t.includes('adelante') || t.includes('mas cerca')) {
      const currentHfov = v.getHfov ? v.getHfov() : 100;
      const targetHfov = Math.max(40, currentHfov - 30);
      if (v.setHfov) v.setHfov(targetHfov, 600);
      const msg = 'Acercando vista';
      setMensajeEstado(msg);
      hablarEnVozAlta(msg);
      return true;
    }

    // Zoom Out / Alejar
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

    // Mira Arriba / Techo
    if (t.includes('arriba') || t.includes('techo') || t.includes('sube') || t.includes('cielo')) {
      if (v.setPitch) v.setPitch(40, 600);
      const msg = 'Enfocando el techo';
      setMensajeEstado(msg);
      hablarEnVozAlta(msg);
      return true;
    }

    // Mira Abajo / Piso
    if (t.includes('abajo') || t.includes('piso') || t.includes('suelo') || t.includes('baja')) {
      if (v.setPitch) v.setPitch(-40, 600);
      const msg = 'Enfocando el suelo';
      setMensajeEstado(msg);
      hablarEnVozAlta(msg);
      return true;
    }

    // Resetear Vista
    if (t.includes('centrar') || t.includes('restablecer') || t.includes('reiniciar') || t.includes('medio')) {
      if (v.setPitch && v.setYaw && v.setHfov) {
        v.setPitch(0, 600);
        v.setYaw(0, 600);
        v.setHfov(100, 600);
      }
      const msg = 'Vista centrada';
      setMensajeEstado(msg);
      hablarEnVozAlta(msg);
      return true;
    }

    return false;
  };

  // 2. Procesamiento de preguntas y mediciones espaciales por voz
  const procesarComandoDeVoz = async (textoHablado) => {
    const txt = textoHablado.trim();
    if (!txt) return;

    // Primero verificamos si es un comando cinemático de cámara local
    const fueComandoLocal = ejecutarComandoCamaraLocal(txt);
    if (fueComandoLocal) return;

    // Si es una pregunta de medidas o espacios, consultamos al motor semántico del Backend
    setProcesando(true);
    setMensajeEstado('Procesando tu consulta...');

    try {
      const res = await api.post('/inmuebles/asistente-espacial/consultar/', {
        consulta: txt,
        inmueble: inmuebleId,
        foto_360_url: fotoActualUrl
      });

      const data = res.data;
      setMensajeEstado(data.respuesta);
      setDimensionesActuales(data.dimensiones);

      // Respuesta en Voz Alta
      hablarEnVozAlta(data.respuesta);

      // Si el backend nos devolvió coordenadas de cámara 360°, orientamos el visor suavemente
      if (data.camara_360 && viewerRef?.current) {
        const v = viewerRef.current;
        const { yaw, pitch, hfov } = data.camara_360;
        if (v.lookAt) {
          v.lookAt(pitch, yaw, hfov || 75, 1000);
        } else {
          if (v.setYaw) v.setYaw(yaw, 800);
          if (v.setPitch) v.setPitch(pitch, 800);
          if (v.setHfov && hfov) v.setHfov(hfov, 800);
        }
      }
    } catch (err) {
      console.error('Error en asistente espacial:', err);
      const errTxt = 'No pude procesar la consulta en este momento.';
      setMensajeEstado(errTxt);
      hablarEnVozAlta(errTxt);
    } finally {
      setProcesando(false);
    }
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
      {/* Cabecera del Modo NLP por Voz */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '8px', borderRadius: '10px' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.96rem', fontWeight: 'bold', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Controlador de Espacios por Voz (Modo NLP Puro)
              <span style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600 }}>
                100% Hablado
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Habla directamente: la IA te responderá en voz alta y enfocará el objeto en 360°
            </div>
          </div>
        </div>

        {/* Interruptor de Audio en Voz Alta */}
        <button
          onClick={() => setVozActiva(!vozActiva)}
          title={vozActiva ? 'Desactivar respuestas en voz alta' : 'Activar respuestas en voz alta'}
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
          <span>{vozActiva ? 'Voz Alta Activada' : 'En Silencio'}</span>
        </button>
      </div>

      {/* Botón Gigante de Activación por Voz */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={toggleMicrofono}
          style={{
            background: escuchando 
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
              : 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            border: 'none',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '14px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            boxShadow: escuchando ? '0 0 20px rgba(239, 68, 68, 0.5)' : '0 4px 12px rgba(2, 132, 199, 0.4)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {escuchando ? <MicOff size={22} /> : <Mic size={22} />}
          <span>{escuchando ? 'Escuchando... (Toca para detener)' : 'Tocar para Hablar'}</span>
        </button>

        {ultimoComando && (
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Radio size={14} color="#38bdf8" />
            <span>Dijiste: "{ultimoComando}"</span>
          </div>
        )}
      </div>

      {/* Tarjeta de Respuesta en Voz Alta y Dimensiones */}
      <div style={{
        marginTop: '14px',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc', fontSize: '0.9rem' }}>
          <Volume2 size={18} color="#38bdf8" />
          <span>{mensajeEstado}</span>
        </div>

        {dimensionesActuales && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {dimensionesActuales.alto_m && (
              <span style={{ background: '#1e293b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', color: '#f8fafc', border: '1px solid #334155' }}>
                Alto: {dimensionesActuales.alto_m} m
              </span>
            )}
            {dimensionesActuales.ancho_m && (
              <span style={{ background: '#1e293b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', color: '#f8fafc', border: '1px solid #334155' }}>
                Ancho: {dimensionesActuales.ancho_m} m
              </span>
            )}
            {dimensionesActuales.largo_m && (
              <span style={{ background: '#1e293b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', color: '#f8fafc', border: '1px solid #334155' }}>
                Largo: {dimensionesActuales.largo_m} m
              </span>
            )}
            {dimensionesActuales.area_m2 && (
              <span style={{ background: '#0284c7', padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', color: 'white', fontWeight: 'bold' }}>
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
