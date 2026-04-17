import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
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
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import UserMenu from '../../components/UserMenu';
import Modal from '../../components/Modal';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import { API_BASE_URL } from '../../config';
import './Propiedades.css';

const MisMensajes = () => {
  const { isAuthenticated, user } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMsg, setNuevoMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByOther, setBlockedByOther] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [whatsappNumero, setWhatsappNumero] = useState('');

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

  const fetchMensajes = useCallback(async (chatId, silent = false) => {
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

  // Crear chat con propietario si viene desde PropiedadDetalle
  useEffect(() => {
    if (!isAuthenticated) return;
    const searchParams = new URLSearchParams(location.search);
    const propietarioId = searchParams.get('propietarioId');
    const inmuebleId = searchParams.get('inmuebleId');
    const inmuebleTitulo = searchParams.get('inmuebleTitulo');

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
    }
  }, [location.search, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchChats();
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedChat || !isAuthenticated) return;
    
    fetchMensajes(selectedChat.id);
    checkBloqueo(selectedChat);
    
    // Auto-refresh mensajes cada 3 segundos
    const interval = setInterval(() => {
      fetchMensajes(selectedChat.id, true);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [selectedChat?.id, isAuthenticated]);

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
      alert('Error iniciando chat');
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
      alert(err.response?.data?.error || 'Error enviando mensaje');
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
      alert('Error subiendo archivo');
    }

    e.target.value = '';
  };

  const handleSendLocation = async () => {
    if (!window.confirm('¿Deseas compartir tu ubicación actual en este chat?')) return;
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    const currentChatId = await ensureChatExists();
    if (!currentChatId) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
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
      () => alert('Error obteniendo ubicación')
    );
  };

  const abrirModalWhatsapp = () => {
    setWhatsappNumero('');
    setShowWhatsappModal(true);
  };

  const confirmarWhatsapp = async () => {
    const limpio = whatsappNumero.replace(/[^\d+]/g, '');
    if (limpio.length < 8) {
      alert('Ingresa un número de WhatsApp válido.');
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
    } catch {
      alert('No se pudo actualizar el bloqueo');
    }
  };

  const handleDeleteChat = async () => {
    if (!window.confirm('¿Estás seguro de eliminar este chat para todos?')) return;
    try {
      await api.delete(`/usuarios/chats/${selectedChat.id}/`);
      setSelectedChat(null);
      fetchChats();
    } catch {
      alert('Error al eliminar chat');
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

    return <div style={{ fontSize: '0.92rem' }}>{msg.contenido}</div>;
  };

  if (!isAuthenticated) {
    return (
      <div className="propiedades-page">
        <Navbar />
        <div className="propiedades-empty">Inicia sesión para ver tus mensajes</div>
      </div>
    );
  }

  return (
    <div className="propiedades-page">
      <Navbar />
      <UserMenu />
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
    </div>
  );
};

export default MisMensajes;
