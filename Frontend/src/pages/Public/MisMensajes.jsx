import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Paperclip,
  MapPin,
  Send,
  Trash2,
  Shield,
  ShieldOff,
  Home,
  MessageSquare,
  Phone,
  Check,
  CheckCheck,
  ExternalLink,
  DollarSign,
  CreditCard,
  FileText,
  Loader2,
  FileSignature,
  FileCheck,
  FileX,
  AlertCircle,
  CheckCircle2,
  Eye,
  Orbit,
} from 'lucide-react';
import Modal from '../../components/Modal';
import ModalRecorrido3D from '../../components/ModalRecorrido3D';
import useAuth from '../../hooks/useAuth';
import useAlertConfirm from '../../hooks/useAlertConfirm';
import api from '../../services/api';
import pagoService from '../../services/pagoService';
import { API_BASE_URL } from '../../config';
import './Propiedades.css';


const TarjetaAcceso360 = ({ accesoId, expiracion, lines, isMine, esOwner, onRevoke, onStart }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);
  const [dbActive, setDbActive] = useState(true);
  const [analytics, setAnalytics] = useState({ visitas: 0, ultimo_acceso: null });

  useEffect(() => {
    if (!accesoId) return;

    const checkDbStatus = async () => {
      try {
        const res = await api.get(`/inmuebles/accesos-360/${accesoId}/`);
        setDbActive(res.data.activo);
        setAnalytics({
          visitas: res.data.visitas || 0,
          ultimo_acceso: res.data.ultimo_acceso_visor
        });
      } catch (err) {
        setDbActive(false);
      }
    };

    checkDbStatus();
    const interval = setInterval(checkDbStatus, 3000);
    return () => clearInterval(interval);
  }, [accesoId]);

  useEffect(() => {
    if (!expiracion) return;

    const updateTimer = () => {
      const expDate = new Date(expiracion);
      const diff = expDate - new Date();
      if (diff <= 0 || !dbActive) {
        setTimeLeft(!dbActive ? 'Acceso Revocado' : 'Acceso Expirado');
        setExpired(true);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        if (mins > 60) {
          const hrs = Math.floor(mins / 60);
          const rMins = mins % 60;
          setTimeLeft(`Quedan ${hrs}h ${rMins}m`);
        } else {
          setTimeLeft(`Quedan ${mins}m ${secs}s`);
        }
        setExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiracion, dbActive]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '240px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isMine ? '#fff' : 'var(--color-primary)' }}>
        <Orbit size={20} className={!expired ? 'spin' : ''} />
        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Recorrido Virtual 360°</span>
      </div>
      <div style={{ fontSize: '0.88rem', opacity: 0.9, background: 'rgba(0,0,0,0.05)', padding: '10px', borderRadius: '8px' }}>
        {lines.map((line, i) => (
          <div key={i} style={{ marginBottom: '2px' }}>{line}</div>
        ))}
      </div>
      
      {/* ─── Analíticas (Solo Propietario) ─── */}
      {esOwner && (analytics.visitas > 0 || analytics.ultimo_acceso) && (
        <div style={{ 
          fontSize: '0.82rem', 
          fontWeight: 600,
          background: 'rgba(255,255,255,0.25)',
          padding: '8px 12px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {(() => {
            if (!analytics.ultimo_acceso) return null;
            const diffSecs = (new Date() - new Date(analytics.ultimo_acceso)) / 1000;
            const isExploringNow = diffSecs < 20;
            
            return (
              <>
                {isExploringNow ? (
                  <>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981', animation: 'pulse 1.5s infinite' }}></span>
                    <span style={{ color: isMine ? '#fff' : '#10b981' }}>El cliente está explorando ahora mismo</span>
                  </>
                ) : (
                  <>
                    <Eye size={16} />
                    <span style={{ opacity: 0.9 }}>Visto por el cliente ({analytics.visitas} veces)</span>
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        fontSize: '0.8rem', 
        fontWeight: 600,
        background: expired ? 'rgba(0,0,0,0.1)' : 'rgba(16,185,129,0.15)',
        color: expired ? '#64748b' : '#059669',
        padding: '6px 12px',
        borderRadius: '20px',
        marginTop: '2px'
      }}>
        <span>🕒 {timeLeft}</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        {!expired && !isMine && (
          <button
            onClick={onStart}
            style={{
              flex: 1, display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              color: '#fff', border: 'none',
              padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.8rem', justifyContent: 'center'
            }}
          >
            <Eye size={14} /> Iniciar Visita
          </button>
        )}
        {esOwner && !expired && (
          <button
            onClick={() => onRevoke(accesoId)}
            style={{
              flex: 1, display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#ef4444', color: '#fff', border: 'none',
              padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.8rem', justifyContent: 'center'
            }}
          >
            Revocar Acceso
          </button>
        )}
      </div>
    </div>
  );
};

const MisMensajes = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { showAlert, showConfirm, ModalComponent } = useAlertConfirm();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMsg, setNuevoMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByOther, setBlockedByOther] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [whatsappNumero, setWhatsappNumero] = useState('');
  const [activePub, setActivePub] = useState(null);

  // ─── Estado de pago Stripe ─────────────────────────────────
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [contratosDisponibles, setContratosDisponibles] = useState([]);
  const [pagoForm, setPagoForm] = useState({ contrato_id: '', monto: '', tipo_operacion: 'mensualidad', descripcion: '', moneda: 'usd' });
  const [pagoLoading, setPagoLoading] = useState(false);
  const [esOwner, setEsOwner] = useState(false);
  const [contratoLoading, setContratoLoading] = useState(false);

  // ─── Estado de Acceso 360 ──────────────────────────────────
  const [showAcceso360Modal, setShowAcceso360Modal] = useState(false);
  const [acceso360Loading, setAcceso360Loading] = useState(false);
  const [showRecorridoVisor, setShowRecorridoVisor] = useState(false);
  const [recorridoPanoramas, setRecorridoPanoramas] = useState([]);


  // ─── Estado de Contrato ────────────────────────────────────
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [tiposContrato, setTiposContrato] = useState([]);
  const [contratoForm, setContratoForm] = useState({
    id: null,
    tipo_contrato: '',
    inicio: '',
    fin: '',
    monto: '',
    deposito: '0',
    moneda: 'USD',
    clausulas: '',
    condiciones_uso: '',
    penalidades: '',
    restricciones: '',
    incluye_servicios: '',
    dia_pago: '1'
  });
  
  // Notificaciones Profesionales (Reemplazo de alert)
  const mostrarMensaje = (title, message, type = 'info') => {
    showAlert({ title, message, status: type === 'success' ? 'success' : type === 'error' ? 'error' : 'info' });
  };

  const location = useLocation();
  const msgEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      const res = await api.get('/usuarios/chats/');
      const loadedChats = res.data.results || res.data;
      setChats(loadedChats);
    } catch {
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMensajes = useCallback(async (chatId) => {
    if (chatId === 'temp') {
      setMensajes([]);
      return;
    }

    try {
      const res = await api.get(`/usuarios/chats/${chatId}/mensajes/`);
      setMensajes(res.data || []);
    } catch {
      setMensajes([]);
    }
  }, []);

  const checkBloqueo = useCallback(async (chat) => {
    if (!chat || chat.id === 'temp' || !user?.id) return;
    const otherUserId = chat.participante1 === user.id ? chat.participante2 : chat.participante1;
    try {
      const res = await api.get(`/usuarios/bloqueos/check/${otherUserId}/`);
      setIsBlocked(!!res.data.bloqueado_por_mi);
      setBlockedByOther(!!res.data.me_bloqueo);
    } catch {
      setIsBlocked(false);
      setBlockedByOther(false);
    }
  }, [user?.id]);

  // ─── Verificar si el usuario es propietario del inmueble del chat ─────
  const checkOwnership = useCallback(async (chat) => {
    if (!chat || chat.id === 'temp' || !chat.inmueble || !user?.id) {
      setEsOwner(false);
      return;
    }
    try {
      const res = await api.get(`/inmuebles/lista/${chat.inmueble}/`);
      setEsOwner(res.data.propietario === user.id);
    } catch {
      setEsOwner(false);
    }
  }, [user?.id]);

  // Crear chat con propietario si viene desde PropiedadDetalle
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const searchParams = new URLSearchParams(location.search);
    const propietarioId = searchParams.get('propietarioId');
    const inmuebleId = searchParams.get('inmuebleId');
    const inmuebleTitulo = searchParams.get('inmuebleTitulo');
    const solicitar360 = searchParams.get('solicitar360');

    if (propietarioId && inmuebleId) {
      const tempChat = {
        id: 'temp',
        participante1: user.id,
        participante2: parseInt(propietarioId),
        inmueble: parseInt(inmuebleId),
        inmueble_titulo: inmuebleTitulo,
        participante2_nombre: 'Propietario',
        participante2_username: `usuario-${propietarioId}`,
        ultimo_mensaje: null,
        fecha_ultimo: new Date().toISOString(),
      };
      setSelectedChat(tempChat);

      if (solicitar360 === 'true') {
        setTimeout(async () => {
          try {
            const resChats = await api.get('/usuarios/chats/');
            const chatList = resChats.data.results || resChats.data || [];
            const existChat = chatList.find(c => 
              c.inmueble === parseInt(inmuebleId) && 
              (c.participante1 === parseInt(propietarioId) || c.participante2 === parseInt(propietarioId))
            );
            
            const chatId = existChat ? existChat.id : 'temp';
            if (chatId !== 'temp') {
              await api.post('/usuarios/mensajes/', {
                chat: chatId,
                tipo: 'texto',
                contenido: 'Hola, estoy muy interesado y me gustaría solicitar acceso temporal al recorrido virtual 360°.',
              });
              navigate('/mensajes');
            } else {
              const createdChatId = await api.post('/usuarios/chats/', {
                participante1: user.id,
                participante2: parseInt(propietarioId),
                inmueble: parseInt(inmuebleId),
              });
              await api.post('/usuarios/mensajes/', {
                chat: createdChatId.data.id,
                tipo: 'texto',
                contenido: 'Hola, estoy muy interesado y me gustaría solicitar acceso temporal al recorrido virtual 360°.',
              });
              navigate('/mensajes');
            }
          } catch (e) {
            console.error("Error al enviar solicitud de recorrido 360:", e);
          }
        }, 500);
      }
    }
  }, [location.search, isAuthenticated, user, navigate]);


  useEffect(() => {
    if (!isAuthenticated) return;
    fetchChats();
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchActivePub = useCallback(async (inmuebleId) => {
    if (!inmuebleId) {
      setActivePub(null);
      return;
    }
    try {
      const res = await api.get('/inmuebles/publicaciones/', {
        params: { inmueble: inmuebleId, estado: 'activa' }
      });
      const data = res.data.results || res.data;
      if (data && data.length > 0) {
        setActivePub(data[0]);
      } else {
        setActivePub(null);
      }
    } catch {
      setActivePub(null);
    }
  }, []);

  useEffect(() => {
    if (!selectedChat || !isAuthenticated) return;
    
    fetchMensajes(selectedChat.id);
    checkBloqueo(selectedChat);
    checkOwnership(selectedChat);
    fetchTiposContrato();
    fetchActivePub(selectedChat.inmueble);
    
    // Auto-refresh mensajes cada 3 segundos
    const interval = setInterval(() => {
      fetchMensajes(selectedChat.id, true);
    }, 3000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat?.id, isAuthenticated, fetchActivePub]);

  useEffect(() => {
    scrollToBottom();
  }, [mensajes, scrollToBottom]);

  const ensureChatExists = async () => {
    if (!selectedChat) return null;
    if (selectedChat.id !== 'temp') return selectedChat.id;

    try {
      const res = await api.post('/usuarios/chats/', {
        participante1: user.id,
        participante2: selectedChat.participante2,
        inmueble: selectedChat.inmueble,
      });
      const newChat = res.data;
      setSelectedChat(newChat);
      setChats((prev) => [newChat, ...prev.filter((c) => c.id !== 'temp')]);
      return newChat.id;
    } catch {
      showAlert({ title: 'Error de Chat', message: 'No se pudo iniciar la conversación en este momento.', status: 'error' });
      return null;
    }
  };

  const handleSend = async (tipo = 'texto', contenido = null) => {
    const msg = contenido || nuevoMsg.trim();
    if (!msg && tipo === 'texto') return;

    const currentChatId = await ensureChatExists();
    if (!currentChatId) return;

    try {
      await api.post('/usuarios/mensajes/', {
        chat: currentChatId,
        tipo,
        contenido: msg,
      });
      setNuevoMsg('');
      await fetchMensajes(currentChatId);
      await fetchChats();
    } catch (err) {
      showAlert({
        title: 'Error de Envío',
        message: err.response?.data?.error || 'No se pudo enviar el mensaje. Inténtalo de nuevo.',
        status: 'error'
      });
    }
  };

  const handleSendFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const currentChatId = await ensureChatExists();
    if (!currentChatId) return;

    const tipo = file.type.startsWith('video/') ? 'video' : 'imagen';
    const formData = new FormData();
    formData.append('chat', currentChatId);
    formData.append('tipo', tipo);
    formData.append('contenido', file.name);
    formData.append('archivo', file);

    try {
      await api.post('/usuarios/mensajes/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchMensajes(currentChatId);
      await fetchChats();
    } catch {
      showAlert({ title: 'Error de subida', message: 'No se pudo subir el archivo seleccionado.', status: 'error' });
    }

    e.target.value = '';
  };

  const handleSendLocation = () => {
    showConfirm({
      title: '¿Compartir Ubicación?',
      message: '¿Deseas compartir tu ubicación GPS actual en este chat con la otra parte?',
      status: 'question',
      confirmText: 'Compartir',
      cancelText: 'Cancelar',
      onConfirm: () => {
        if (!navigator.geolocation) {
          showAlert({ title: 'No soportado', message: 'Tu navegador no soporta geolocalización.', status: 'warning' });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const currentChatId = await ensureChatExists();
            if (!currentChatId) return;

            const gps = `${pos.coords.latitude}, ${pos.coords.longitude}`;
            await api.post('/usuarios/mensajes/', {
              chat: currentChatId,
              tipo: 'ubicacion',
              contenido: 'Ubicación compartida',
              ubicacion: gps,
            });
            await fetchMensajes(currentChatId);
            await fetchChats();
          },
          () => showAlert({ title: 'Error GPS', message: 'No se pudo obtener tu ubicación actual.', status: 'error' })
        );
      }
    });
  };

  const abrirModalWhatsapp = () => {
    setWhatsappNumero('');
    setShowWhatsappModal(true);
  };

  const confirmarWhatsapp = async () => {
    const limpio = whatsappNumero.replace(/[^\d+]/g, '');
    if (limpio.length < 8) {
      showAlert({ title: 'Número inválido', message: 'Ingresa un número de WhatsApp válido de al menos 8 dígitos.', status: 'warning' });
      return;
    }

    const numeroPlano = limpio.replace(/^\+/, '');
    const enlace = `https://wa.me/${numeroPlano}`;
    await handleSend('whatsapp', `Contacto WhatsApp: ${limpio} (${enlace})`);
    setShowWhatsappModal(false);
  };

  const handleBlockToggle = async () => {
    const otherUserId = selectedChat.participante1 === user.id ? selectedChat.participante2 : selectedChat.participante1;
    try {
      const res = await api.post('/usuarios/bloqueos/toggle/', { bloqueado: otherUserId });
      setIsBlocked(!!res.data.bloqueado);
      fetchChats();
      showAlert({ title: 'Usuario Bloqueado', message: 'Se ha actualizado el estado de bloqueo correctamente.', status: 'success' });
    } catch {
      showAlert({ title: 'Error', message: 'No se pudo actualizar el estado de bloqueo.', status: 'error' });
    }
  };

  const handleDeleteChat = () => {
    showConfirm({
      title: '¿Eliminar Chat?',
      message: '¿Estás seguro de que deseas eliminar este chat para todos? Esta acción es irreversible.',
      status: 'error',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await api.delete(`/usuarios/chats/${selectedChat.id}/`);
          setSelectedChat(null);
          fetchChats();
          showAlert({ title: 'Chat Eliminado', message: 'La conversación ha sido eliminada exitosamente.', status: 'success' });
        } catch {
          showAlert({ title: 'Error', message: 'No se pudo eliminar el chat.', status: 'error' });
        }
      }
    });
  };

  // ─── Recorridos 360: Autorización y Visualización ───────────
  const abrirModalAcceso360 = () => {
    setShowAcceso360Modal(true);
  };

  const handleOtorgarAcceso360 = async (horas) => {
    setAcceso360Loading(true);
    const exp = new Date(Date.now() + parseFloat(horas) * 3600000);

    
    try {
      const inquilinoId = selectedChat.participante1 === user.id ? selectedChat.participante2 : selectedChat.participante1;
      const resAcceso = await api.post('/inmuebles/accesos-360/', {
        inmueble: selectedChat.inmueble,
        cliente: inquilinoId,
        chat: selectedChat.id,
        fecha_expiracion: exp.toISOString(),
        activo: true
      });

      await handleSend('recorrido360', `ACCESO_360:${resAcceso.data.id}:EXPIRACION:${exp.toISOString()}:END\nTe he concedido acceso temporal al Recorrido Virtual 360° de esta propiedad por ${horas} ${horas === '1' ? 'hora' : 'horas'}.`);
      setShowAcceso360Modal(false);
      mostrarMensaje('Acceso Concedido', 'Se ha otorgado el acceso al recorrido 360° con éxito.', 'success');
    } catch (err) {
      console.error(err);
      mostrarMensaje('Error', 'No se pudo otorgar el acceso.', 'error');
    } finally {
      setAcceso360Loading(false);
    }
  };

  const handleRevocarAcceso360 = async (accesoId) => {
    try {
      await api.post(`/inmuebles/accesos-360/${accesoId}/revocar/`);
      await fetchMensajes(selectedChat.id);
      mostrarMensaje('Acceso Revocado', 'Se ha cancelado el acceso al recorrido 360°.', 'success');
    } catch {
      mostrarMensaje('Error', 'No se pudo revocar el acceso.', 'error');
    }
  };

  const handleIniciarRecorrido360 = async () => {
    try {
      const res = await api.get(`/inmuebles/lista/${selectedChat.inmueble}/`);
      const panos = res.data.multimedia?.filter(m => m.tipo === 'panorama360') || [];
      if (panos.length === 0) {
        mostrarMensaje('Sin imágenes 360°', 'Esta propiedad no tiene configurado ningún panorama 360°.', 'warning');
        return;
      }
      setRecorridoPanoramas(panos);
      setShowRecorridoVisor(true);
    } catch {
      mostrarMensaje('Error', 'No se pudo cargar el recorrido virtual.', 'error');
    }
  };


  // ─── Contratos: Cargar tipos y gestionar ───────────────────
  const fetchTiposContrato = async () => {
    try {
      const res = await api.get('/inmuebles/tipos-contrato/');
      setTiposContrato(res.data.results || res.data);
    } catch { setTiposContrato([]); }
  };

  const abrirModalContrato = async (idContrato = null) => {
    setContratoLoading(true);
    setShowContratoModal(true);
    
    if (idContrato) {
      try {
        const res = await api.get(`/inmuebles/contratos/${idContrato}/`);
        setContratoForm(res.data);
      } catch { mostrarMensaje('Error', 'No se pudo cargar el detalle del contrato.', 'error'); }
    } else {
      // Default para nuevo contrato
      const inquilinoId = selectedChat.participante1 === user.id ? selectedChat.participante2 : selectedChat.participante1;
      setContratoForm({
        id: null,
        inmueble: selectedChat.inmueble,
        inquilino: inquilinoId,
        chat: selectedChat.id,
        tipo_contrato: '',
        inicio: new Date().toISOString().split('T')[0],
        fin: '',
        monto: selectedChat.inmueble_precio || '', // Monto predefinido
        deposito: '0',
        moneda: 'BOB', // Solo Bolivianos
        clausulas: 'PRIMERA: El arrendador entrega el inmueble en buenas condiciones...\nSEGUNDA: El pago se realizara mensualmente...',
        condiciones_uso: 'Uso exclusivo de vivienda familiar.',
        penalidades: 'Mora del 5% por retraso en el pago superior a 5 dias.',
        restricciones: 'No se permiten mascotas de gran tamaño. No subarrendar.',
        incluye_servicios: 'Agua y Luz incluidos.',
        dia_pago: '5'
      });
    }
    setContratoLoading(false);
  };

  const handleGuardarContrato = async () => {
    if (!contratoForm.tipo_contrato || !contratoForm.monto || !contratoForm.inicio) {
      showAlert({ title: 'Campos requeridos', message: 'Por favor rellena los campos obligatorios del contrato (Tipo de Contrato, Monto y Fecha de Inicio).', status: 'warning' });
      return;
    }
    setContratoLoading(true);
    
    const dataToSave = {
      ...contratoForm,
      inmueble: typeof contratoForm.inmueble === 'object' ? contratoForm.inmueble.id : contratoForm.inmueble,
      inquilino: typeof contratoForm.inquilino === 'object' ? contratoForm.inquilino.id : contratoForm.inquilino,
      tipo_contrato: parseInt(contratoForm.tipo_contrato),
      chat: selectedChat.id,
      fin: contratoForm.fin === '' ? null : contratoForm.fin // SOLUCION AL ERROR DE FECHA
    };

    try {
      let res;
      if (dataToSave.id) {
        res = await api.put(`/inmuebles/contratos/${dataToSave.id}/`, dataToSave);
      } else {
        res = await api.post('/inmuebles/contratos/', dataToSave);
      }
      
      await api.post(`/inmuebles/contratos/${res.data.id}/enviar/`);
      setShowContratoModal(false);
      fetchMensajes(selectedChat.id);
      mostrarMensaje('Contrato Enviado', 'La propuesta legal ha sido enviada exitosamente.', 'success');
    } catch (err) {
      console.error("Error al guardar contrato:", err.response?.data);
      const detail = err.response?.data ? JSON.stringify(err.response.data) : 'Verifique los campos del contrato.';
      mostrarMensaje('Error de Validacion', detail, 'error');
    } finally {
      setContratoLoading(false);
    }
  };

  // ─── Stripe: Abrir modal de pago ──────────────────────────
  const abrirModalPago = async () => {
    setPagoLoading(true);
    try {
      const contratos = await pagoService.obtenerContratosParaPago({ chat_id: selectedChat.id });
      const aceptados = contratos.filter(c => c.estado === 'aceptado' || c.estado === 'activo');
      
      if (aceptados.length === 0) {
        // SI NO HAY CONTRATOS ACEPTADOS, ABRIMOS EL MODAL DE CONTRATO DIRECTAMENTE
        setShowPagoModal(false);
        abrirModalContrato();
        return;
      }

      setContratosDisponibles(aceptados);
      setShowPagoModal(true);
      setPagoForm({ contrato_id: '', monto: '', tipo_operacion: 'mensualidad', descripcion: '', moneda: 'usd' });
      
      if (aceptados.length === 1) {
        setPagoForm(prev => ({ ...prev, contrato_id: aceptados[0].id, monto: aceptados[0].monto }));
      }
    } catch {
      setContratosDisponibles([]);
      abrirModalContrato(); // Ante error, también permitimos redactar
    } finally {
      setPagoLoading(false);
    }
  };

  const handleEnviarSolicitudPago = async () => {
    if (!pagoForm.contrato_id || !pagoForm.monto || parseFloat(pagoForm.monto) <= 0) {
      showAlert({ title: 'Datos requeridos', message: 'Por favor, selecciona un contrato y un monto válido para generar el cobro.', status: 'warning' });
      return;
    }
    setPagoLoading(true);
    try {
      await pagoService.crearSesionPago({
        contrato_id: pagoForm.contrato_id,
        monto: pagoForm.monto,
        tipo_operacion: pagoForm.tipo_operacion,
        descripcion: pagoForm.descripcion,
        chat_id: selectedChat.id,
        moneda: pagoForm.moneda,
      });
      setShowPagoModal(false);
      await fetchMensajes(selectedChat.id);
      await fetchChats();
      showAlert({ title: 'Cobro Generado', message: 'La solicitud de pago seguro mediante Stripe ha sido creada y enviada al chat con éxito.', status: 'success' });
    } catch (err) {
      showAlert({ title: 'Error de cobro', message: err.response?.data?.error || 'No se pudo generar el enlace de pago Stripe.', status: 'error' });
    } finally {
      setPagoLoading(false);
    }
  };

  const getOtherName = (chat) => (chat.participante1 === user?.id ? chat.participante2_nombre : chat.participante1_nombre);
  const getOtherUsername = (chat) => (chat.participante1 === user?.id ? chat.participante2_username : chat.participante1_username);

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Hoy';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
  };

  const renderMensajeContenido = (msg, isMine) => {
    const tipo = msg.tipo || msg.tipo_mensaje;
    const archivo = msg.archivo || msg.archivo_url;
    const ubicacion = msg.ubicacion || msg.ubicacion_gps;

    if (tipo === 'recorrido360' || msg.contenido?.includes('ACCESO_360:')) {
      const match = msg.contenido.match(/ACCESO_360:(\d+):EXPIRACION:(.*?):END/);
      const accesoId = match ? match[1] : null;
      const expStr = match ? match[2] : null;
      const lines = msg.contenido.split('\n').filter(l => !l.includes('ACCESO_360:'));

      return (
        <TarjetaAcceso360
          accesoId={accesoId}
          expiracion={expStr}
          lines={lines}
          isMine={isMine}
          esOwner={esOwner}
          onRevoke={handleRevocarAcceso360}
          onStart={handleIniciarRecorrido360}
        />
      );
    }

    if (tipo === 'imagen' && archivo) {

      return <img src={archivo} alt="Imagen enviada" style={{ maxWidth: '100%', borderRadius: '8px' }} />;
    }

    if (tipo === 'video' && archivo) {
      return <video src={archivo} controls style={{ maxWidth: '100%', borderRadius: '8px' }} />;
    }

    if (tipo === 'ubicacion' && ubicacion) {
      return (
        <a
          href={`https://www.google.com/maps?q=${ubicacion.replace(' ', '')}`}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            gap: '6px',
            alignItems: 'center',
            textDecoration: 'none',
            color: isMine ? '#fff' : '#0ea5e9',
            fontWeight: 600,
          }}
        >
          <MapPin size={14} />
          Ver ubicación en Google Maps
        </a>
      );
    }

    if (tipo === 'whatsapp' && msg.contenido?.includes('wa.me/')) {
      const match = msg.contenido.match(/https:\/\/wa\.me\/\d+/);
      const href = match ? match[0] : null;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '0.92rem' }}>{msg.contenido}</div>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                gap: '6px',
                alignItems: 'center',
                textDecoration: 'none',
                color: isMine ? '#fff' : '#0ea5e9',
                fontWeight: 600,
              }}
            >
              <Phone size={14} />
              Abrir WhatsApp
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      );
    }

    // ─── Contrato Review Card ────────────────────────────────
    if (msg.contenido?.includes('CONTRATO_REVIEW:')) {
      const match = msg.contenido.match(/CONTRATO_REVIEW:(\d+):END/);
      const contratoId = match ? match[1] : null;
      const lines = msg.contenido.split('\n').filter(l => !l.includes('CONTRATO_REVIEW:'));
      
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isMine ? '#fff' : '#6366f1' }}>
            <FileSignature size={20} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Propuesta de Contrato</span>
          </div>
          <div style={{ fontSize: '0.88rem', opacity: 0.9, background: 'rgba(0,0,0,0.05)', padding: '10px', borderRadius: '8px' }}>
            {lines.map((line, i) => (
              <div key={i} style={{ marginBottom: '2px' }}>{line}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <Link
              to="/mis-contratos"
              style={{
                flex: 1, display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: isMine ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                color: isMine ? '#fff' : '#475569', padding: '8px 12px', borderRadius: '8px',
                textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem', justifyContent: 'center'
              }}
            >
              <Eye size={14} /> Ver detalles
            </Link>
            {isMine && (
              <button
                onClick={() => abrirModalContrato(contratoId)}
                style={{
                  flex: 1, display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none',
                  padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.8rem', justifyContent: 'center'
                }}
              >
                Editar
              </button>
            )}
          </div>
        </div>
      );
    }

    // ─── Stripe Payment Link ─────────────────────────────────
    if (msg.contenido?.includes('STRIPE_PAYMENT:')) {
      const payMatch = msg.contenido.match(/STRIPE_PAYMENT:(.*?):TRANSACCION:(\d+):END/);
      const payUrl = payMatch ? payMatch[1] : null;
      const txId = payMatch ? payMatch[2] : null;
      const lines = msg.contenido.split('\n').filter(l => !l.includes('STRIPE_PAYMENT:'));
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {lines.map((line, i) => (
            <div key={i} style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{line}</div>
          ))}
          {payUrl && !isMine && (
            <a
              href={payUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', padding: '12px 20px', borderRadius: '12px',
                textDecoration: 'none', fontWeight: 700, fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)', transition: 'transform 0.15s',
                justifyContent: 'center', marginTop: '4px',
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <CreditCard size={18} /> Pagar con Stripe
            </a>
          )}
          {isMine && <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Enlace de pago enviado (Tx #{txId})</div>}
        </div>
      );
    }

    // ─── Stripe Receipt ─────────────────────────────────────
    if (msg.contenido?.includes('STRIPE_RECEIPT:')) {
      const receiptMatch = msg.contenido.match(/STRIPE_RECEIPT:(.*?):END/);
      const receiptUrl = receiptMatch ? receiptMatch[1] : null;
      const lines = msg.contenido.split('\n').filter(l => !l.includes('STRIPE_RECEIPT:'));
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {lines.map((line, i) => (
            <div key={i} style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{line}</div>
          ))}
          {receiptUrl && receiptUrl !== '' && (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                color: isMine ? '#fff' : '#059669', fontWeight: 600,
                textDecoration: 'none', fontSize: '0.9rem',
              }}
            >
              <FileText size={14} /> Ver Comprobante
            </a>
          )}
        </div>
      );
    }

    return <div style={{ fontSize: '0.92rem' }}>{msg.contenido}</div>;
  };

  if (!isAuthenticated) {
    return (
      <div className="propiedades-page">
        <div className="propiedades-empty">Inicia sesión para ver tus mensajes</div>
      </div>
    );
  }

  return (
    <div className="propiedades-page" style={{ paddingTop: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', flex: 1 }}>
        <div
          style={{
            display: 'flex',
            gap: '0',
            height: 'calc(100vh - 220px)',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              width: '340px',
              borderRight: '1px solid var(--color-border)',
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '20px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>Chats</h2>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? <div style={{ padding: '24px', textAlign: 'center', color: '#aaa' }}>Cargando...</div> : null}
              {!loading && chats.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#aaa' }}>No tienes chats aún</div>
              ) : null}
              {!loading &&
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    style={{
                      padding: '14px 20px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      background: selectedChat?.id === chat.id ? 'rgba(14,165,233,0.08)' : 'transparent',
                      transition: 'background 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        flexShrink: 0,
                      }}
                    >
                      {getOtherName(chat)?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' }}>{getOtherName(chat)}</span>
                        {chat.ultimo_mensaje && (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{formatDate(chat.ultimo_mensaje.creado)}</span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '2px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '0.82rem',
                            color: '#64748b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '160px',
                          }}
                        >
                          {chat.ultimo_mensaje?.contenido ||
                            (chat.inmueble_titulo ? `Sobre: ${chat.inmueble_titulo}` : 'Sin mensajes')}
                        </span>
                        {chat.no_leidos > 0 && (
                          <span
                            style={{
                              background: '#0ea5e9',
                              color: '#fff',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              borderRadius: '10px',
                              padding: '2px 6px',
                              minWidth: '18px',
                              textAlign: 'center',
                            }}
                          >
                            {chat.no_leidos}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
            {!selectedChat ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: '#94a3b8',
                }}
              >
                <MessageSquare size={64} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                <p style={{ fontSize: '1.1rem' }}>Selecciona un chat para comenzar</p>
              </div>
            ) : (
              <>
                <div
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--color-border)',
                    background: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 700,
                      }}
                    >
                      {getOtherName(selectedChat)?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{getOtherName(selectedChat)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        @{getOtherUsername(selectedChat)}
                        {selectedChat.inmueble_titulo && selectedChat.inmueble && (
                          <>
                            {' '}
                            ·{' '}
                            <Link
                              to={`/propiedades/${selectedChat.inmueble}`}
                              style={{
                                color: '#0ea5e9',
                                textDecoration: 'none',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Ver Propiedad"
                            >
                              <Home size={14} /> {selectedChat.inmueble_titulo}
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleBlockToggle}
                      style={{
                        background: isBlocked ? '#ef4444' : '#f1f5f9',
                        color: isBlocked ? '#fff' : '#64748b',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {isBlocked ? <ShieldOff size={16} /> : <Shield size={16} />}
                      {isBlocked ? 'Desbloquear' : 'Bloquear'}
                    </button>
                    <button
                      onClick={handleDeleteChat}
                      style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Trash2 size={16} /> Eliminar
                    </button>
                  </div>
                </div>

                {activePub && (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
                      padding: '12px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      animation: 'slideDown 0.3s ease',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          background:
                            activePub.tipo_oferta === 'alquiler'
                              ? 'hsla(210, 100%, 96%, 1)'
                              : activePub.tipo_oferta === 'venta'
                              ? 'hsla(140, 100%, 95%, 1)'
                              : 'hsla(280, 100%, 96%, 1)',
                          color:
                            activePub.tipo_oferta === 'alquiler'
                              ? 'hsla(210, 100%, 45%, 1)'
                              : activePub.tipo_oferta === 'venta'
                              ? 'hsla(140, 90%, 30%, 1)'
                              : 'hsla(280, 90%, 40%, 1)',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: `1px solid ${
                            activePub.tipo_oferta === 'alquiler'
                              ? 'hsla(210, 100%, 90%, 1)'
                              : activePub.tipo_oferta === 'venta'
                              ? 'hsla(140, 100%, 85%, 1)'
                              : 'hsla(280, 100%, 90%, 1)'
                          }`,
                        }}
                      >
                        {activePub.tipo_oferta === 'alquiler' && 'Alquiler'}
                        {activePub.tipo_oferta === 'venta' && 'Venta'}
                        {activePub.tipo_oferta === 'anticretico' && 'Anticrético'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Precio:</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                          Bs. {parseFloat(activePub.precio).toLocaleString('es-BO')}
                        </span>
                        {activePub.tipo_oferta === 'alquiler' && (
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>/mes</span>
                        )}
                      </div>
                      <span style={{ color: '#cbd5e1' }}>|</span>
                      <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} color="#64748b" />
                        {activePub.inmueble_direccion || selectedChat.inmueble_titulo}
                      </span>
                    </div>
                    <Link
                      to={`/propiedades/${selectedChat.inmueble}`}
                      style={{
                        background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                        color: '#fff',
                        padding: '8px 16px',
                        borderRadius: '24px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 10px rgba(14, 165, 233, 0.25)',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 14px rgba(14, 165, 233, 0.35)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 10px rgba(14, 165, 233, 0.25)';
                      }}
                    >
                      Ver Inmueble
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                )}

                {!activePub && selectedChat?.inmueble && (
                  <div
                    style={{
                      background: 'rgba(254, 243, 199, 0.4)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      borderBottom: '1px solid rgba(251, 191, 36, 0.2)',
                      padding: '8px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      fontSize: '0.8rem',
                      color: '#b45309',
                    }}
                  >
                    <span style={{ fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={14} />
                      Este inmueble no cuenta con una oferta comercial activa en este momento.
                    </span>
                    <Link
                      to={`/propiedades/${selectedChat.inmueble}`}
                      style={{
                        color: '#b45309',
                        fontWeight: 700,
                        textDecoration: 'underline',
                      }}
                    >
                      Ver detalles físicos
                    </Link>
                  </div>
                )}

                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {mensajes.map((msg) => {
                    const isMine = msg.remitente === user?.id;
                    return (
                      <div key={msg.id} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                        <div
                          style={{
                            background: isMine ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : '#fff',
                            color: isMine ? '#fff' : '#1e293b',
                            padding: '10px 14px',
                            borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            wordBreak: 'break-word',
                          }}
                        >
                          {renderMensajeContenido(msg, isMine)}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            justifyContent: isMine ? 'flex-end' : 'flex-start',
                            marginTop: '2px',
                          }}
                        >
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{formatTime(msg.creado)}</span>
                          {isMine && (
                            <span style={{ color: msg.leido ? '#0ea5e9' : '#cbd5e1' }}>
                              {msg.leido ? <CheckCheck size={14} /> : <Check size={14} />}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={msgEndRef} />
                </div>

                {isBlocked || blockedByOther ? (
                  <div
                    style={{
                      padding: '16px 20px',
                      background: '#fef2f2',
                      textAlign: 'center',
                      color: '#dc2626',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <ShieldOff size={18} /> {isBlocked ? 'Has bloqueado a este usuario' : 'Este usuario te ha bloqueado'}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '12px 20px',
                      borderTop: '1px solid var(--color-border)',
                      background: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '6px',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Adjuntar archivo"
                      >
                        <Paperclip size={22} color="#64748b" />
                      </button>
                      <button
                        onClick={handleSendLocation}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '6px',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Enviar ubicación"
                      >
                        <MapPin size={22} color="#64748b" />
                      </button>
                      <button
                        onClick={abrirModalWhatsapp}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '6px',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Compartir WhatsApp"
                      >
                        <Phone size={22} color="#64748b" />
                      </button>
                      {esOwner && (
                        <button
                          onClick={abrirModalAcceso360}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Permitir Recorrido 360°"
                        >
                          <Orbit size={22} color="var(--color-primary)" />
                        </button>
                      )}
                        {esOwner && (

                          <button
                            onClick={abrirModalPago}
                            style={{
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              transition: 'transform 0.15s',
                            }}
                            title="Cobrar"
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            <DollarSign size={18} /> Cobrar
                          </button>
                        )}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleSendFile}
                        accept="image/*,video/*"
                        style={{ display: 'none' }}
                      />
                      <input
                        type="text"
                        value={nuevoMsg}
                        onChange={(e) => setNuevoMsg(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Escribe un mensaje..."
                        style={{
                          flex: 1,
                          border: '1px solid #e2e8f0',
                          borderRadius: '24px',
                          padding: '10px 18px',
                          fontSize: '0.92rem',
                          outline: 'none',
                          transition: 'border 0.2s',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#0ea5e9';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e2e8f0';
                        }}
                      />
                      <button
                        onClick={() => handleSend()}
                        style={{
                          background: 'var(--color-primary)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '40px',
                          height: '40px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'transform 0.15s',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Send size={18} style={{ marginLeft: '2px' }} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showWhatsappModal}
        onClose={() => setShowWhatsappModal(false)}
        title="Confirmar envío de WhatsApp"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            Estás a punto de compartir tu número de WhatsApp en este chat. Esta acción no se puede deshacer.
          </p>
          <input
            type="text"
            value={whatsappNumero}
            onChange={(e) => setWhatsappNumero(e.target.value)}
            placeholder="Ejemplo: +59170000000"
            style={{
              width: '100%',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '0.95rem',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={() => setShowWhatsappModal(false)}
              style={{
                border: '1px solid var(--color-border)',
                background: '#fff',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={confirmarWhatsapp}
              style={{
                border: 'none',
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Phone size={16} /> Confirmar envío
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Modal de Creación/Edición de Contrato ────────────────── */}
      <Modal
        isOpen={showContratoModal}
        onClose={() => setShowContratoModal(false)}
        title={contratoForm.id ? "Gestionar Contrato" : "Redactar Propuesta de Contrato"}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto', padding: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#f8fafc', borderRadius: '10px', marginBottom: '8px' }}>
            <FileText size={24} color="#6366f1" />
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>Complete los terminos legales para formalizar el acuerdo con el cliente.</p>
          </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>Tipo de Contrato *</label>
                  <select
                    value={contratoForm.tipo_contrato}
                    onChange={e => setContratoForm({ ...contratoForm, tipo_contrato: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value="">Seleccione...</option>
                    {tiposContrato.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>Moneda</label>
                  <input
                    type="text"
                    value="Bolivianos (BOB)"
                    readOnly
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb', color: '#64748b' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>Monto Total *</label>
                  <input
                    type="number"
                    value={contratoForm.monto}
                    onChange={e => setContratoForm({ ...contratoForm, monto: e.target.value })}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>Garantía / Depósito</label>
                  <input
                    type="number"
                    value={contratoForm.deposito}
                    onChange={e => setContratoForm({ ...contratoForm, deposito: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>Fecha Inicio *</label>
                  <input
                    type="date"
                    value={contratoForm.inicio}
                    onChange={e => setContratoForm({ ...contratoForm, inicio: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>Día de Pago (Mensual)</label>
                  <input
                    type="number"
                    min="1" max="28"
                    value={contratoForm.dia_pago}
                    onChange={e => setContratoForm({ ...contratoForm, dia_pago: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>Cláusulas Legales Detalladas</label>
                <textarea
                  value={contratoForm.clausulas}
                  onChange={e => setContratoForm({ ...contratoForm, clausulas: e.target.value })}
                  rows={4}
                  placeholder="Detalle todas las cláusulas legales aquí..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>Servicios Incluidos</label>
                  <textarea
                    value={contratoForm.incluye_servicios}
                    onChange={e => setContratoForm({ ...contratoForm, incluye_servicios: e.target.value })}
                    rows={2}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '4px' }}>Restricciones</label>
                  <textarea
                    value={contratoForm.restricciones}
                    onChange={e => setContratoForm({ ...contratoForm, restricciones: e.target.value })}
                    rows={2}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setShowContratoModal(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', background: '#fff', borderRadius: '8px', fontWeight: 600 }}>Cancelar</button>
                <button
                  onClick={handleGuardarContrato}
                  disabled={contratoLoading}
                  style={{
                    padding: '10px 24px', background: contratoLoading ? '#cbd5e1' : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                    color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '8px',
                    cursor: contratoLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {contratoLoading ? <Loader2 className="animate-spin" size={18} /> : <FileCheck size={18} />}
                  {contratoLoading ? 'Enviando...' : 'Guardar y Enviar al Cliente'}
                </button>
              </div>
        </div>
      </Modal>

      {/* ─── Modal de Solicitud de Pago Stripe ─────────────────── */}
      <Modal
        isOpen={showPagoModal}
        onClose={() => setShowPagoModal(false)}
        title="Solicitud de Pago Seguro"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {pagoLoading && contratosDisponibles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Loader2 size={32} className="spin" />
              <p style={{ color: '#64748b', marginTop: '8px' }}>Cargando contratos aceptados...</p>
            </div>
          ) : contratosDisponibles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 10px', color: '#f59e0b' }} />
              <p>No hay contratos <b>ACEPTADOS</b> por el cliente.</p>
              <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>Debes enviar un contrato legal y que el cliente lo acepte antes de cobrar.</p>
              <button 
                onClick={() => { setShowPagoModal(false); abrirModalContrato(); }}
                style={{
                  background: '#6366f1', color: '#fff', border: 'none', padding: '10px 20px', 
                  borderRadius: '8px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Redactar Contrato Ahora
              </button>
            </div>
          ) : (
            <>
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151', marginBottom: '4px', display: 'block' }}>Contrato Aceptado</label>
                <select
                  value={pagoForm.contrato_id}
                  onChange={e => {
                    const c = contratosDisponibles.find(x => x.id === parseInt(e.target.value));
                    setPagoForm(prev => ({ ...prev, contrato_id: e.target.value, monto: c?.monto || prev.monto }));
                  }}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px', fontSize: '0.9rem' }}
                >
                  <option value="">Seleccionar contrato...</option>
                  {contratosDisponibles.map(c => (
                    <option key={c.id} value={c.id}>
                      #{c.id} — {c.inmueble_titulo} ({c.tipo_contrato_nombre})
                    </option>
                  ))}
                </select>
              </div>
              {/* ... resto del formulario de pago (monto, moneda, etc) ... */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151', marginBottom: '4px', display: 'block' }}>Monto</label>
                  <input
                    type="number"
                    value={pagoForm.monto}
                    onChange={e => setPagoForm(prev => ({ ...prev, monto: e.target.value }))}
                    placeholder="0.00"
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151', marginBottom: '4px', display: 'block' }}>Moneda</label>
                  <select
                    value={pagoForm.moneda}
                    onChange={e => setPagoForm(prev => ({ ...prev, moneda: e.target.value }))}
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px', fontSize: '0.9rem' }}
                  >
                    <option value="usd">USD</option>
                    <option value="bob">BOB</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button onClick={() => setShowPagoModal(false)} style={{ border: '1px solid #d1d5db', background: '#fff', borderRadius: '8px', padding: '10px 16px', fontWeight: 600 }}>Cancelar</button>
                <button
                  onClick={handleEnviarSolicitudPago}
                  disabled={pagoLoading}
                  style={{
                    border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', borderRadius: '8px', padding: '10px 20px', fontWeight: 700,
                    display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: pagoLoading ? 0.7 : 1
                  }}
                >
                  <CreditCard size={16} /> {pagoLoading ? 'Enviando...' : 'Enviar Enlace de Pago'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ─── Modal de Autorización 360° ────────────────────────── */}
      <Modal

        isOpen={showAcceso360Modal}
        onClose={() => setShowAcceso360Modal(false)}
        title="Autorizar Recorrido Virtual 360°"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'rgba(14,165,233,0.06)', borderRadius: '10px' }}>
            <Orbit size={24} color="var(--color-primary)" />
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
              Selecciona la duración para la cual deseas permitir que el cliente explore la propiedad de forma inmersiva.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
            <button
              onClick={() => handleOtorgarAcceso360('0.5')}
              disabled={acceso360Loading}
              style={{
                padding: '16px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = '#f0f9ff'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
            >
              <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>30 Min</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Visita rápida</span>
            </button>
            <button
              onClick={() => handleOtorgarAcceso360('2')}
              disabled={acceso360Loading}
              style={{
                padding: '16px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = '#f0f9ff'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
            >
              <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>2 Horas</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Estándar</span>
            </button>
            <button
              onClick={() => handleOtorgarAcceso360('12')}
              disabled={acceso360Loading}
              style={{
                padding: '16px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = '#f0f9ff'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
            >
              <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>12 Horas</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Medio día</span>
            </button>
            <button
              onClick={() => handleOtorgarAcceso360('24')}
              disabled={acceso360Loading}
              style={{
                padding: '16px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = '#f0f9ff'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
            >
              <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>24 Horas</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Día completo</span>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              onClick={() => setShowAcceso360Modal(false)}
              style={{
                border: '1px solid #d1d5db',
                background: '#fff',
                borderRadius: '8px',
                padding: '10px 16px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Visor inmersivo a pantalla completa ─────────────────── */}
      {showRecorridoVisor && (
        <ModalRecorrido3D
          panoramas={recorridoPanoramas}
          tituloPropiedad={selectedChat?.inmueble_titulo || 'Recorrido Virtual'}
          onClose={() => {
            setShowRecorridoVisor(false);
            setRecorridoPanoramas([]);
          }}
        />
      )}

      {ModalComponent}


      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default MisMensajes;


