import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Smile, Paperclip, MapPin, Send, Trash2, Shield, ShieldOff, Home, MessageSquare } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import Navbar from '../../components/Navbar';
import UserMenu from '../../components/UserMenu';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import './Propiedades.css';

const MisMensajes = () => {
  const { isAuthenticated, user } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMsg, setNuevoMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEmojis, setShowEmojis] = useState(false);
  const location = useLocation();
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByOther, setBlockedByOther] = useState(false);
  const msgEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollingRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      const res = await api.get('/usuarios/chats/');
      const loadedChats = res.data.results || res.data;

      const queryParams = new URLSearchParams(location.search);
      const propietarioIdParam = queryParams.get('propietarioId');
      
      let finalChats = [...loadedChats];
      
      if (propietarioIdParam && user?.id) {
        const targetUserId = parseInt(propietarioIdParam);
        const existingChat = loadedChats.find(c => 
          c.participante1 === targetUserId || c.participante2 === targetUserId
        );
        
        if (existingChat) {
          setSelectedChat(existingChat);
        } else {
          const tempChat = {
            id: 'temp',
            participante1: user.id,
            participante2: targetUserId,
            participante1_nombre: user.first_name,
            participante1_username: user.username,
            participante2_nombre: queryParams.get('propietarioNombre') || 'Agente',
            participante2_username: 'agente',
            inmueble: parseInt(queryParams.get('inmuebleId')),
            inmueble_titulo: queryParams.get('inmuebleTitulo') || '',
            temp: true
          };
          finalChats = [tempChat, ...loadedChats];
          setSelectedChat(tempChat);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      setChats(finalChats);
    } catch (e) { /* ignore */ }
    setLoading(false);
  }, [location.search, user?.id, user?.first_name, user?.username]);

  const fetchMensajes = useCallback(async (chatId, silent = false) => {
    if (chatId === 'temp') {
      setMensajes([]);
      if (!silent) fetchChats();
      return;
    }
    try {
      const res = await api.get(`/usuarios/chats/${chatId}/mensajes/`);
      setMensajes(res.data);
      if (!silent) fetchChats();
    } catch (e) { /* ignore */ }
  }, [fetchChats]);

  const checkBloqueo = useCallback(async (chat) => {
    if (!chat) return;
    const otherUserId = chat.participante1 === user?.id ? chat.participante2 : chat.participante1;
    try {
      const res = await api.get(`/usuarios/bloqueos/check/${otherUserId}/`);
      setIsBlocked(res.data.bloqueado_por_mi);
      setBlockedByOther(res.data.me_bloqueo);
    } catch (e) { /* ignore */ }
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchChats();
  }, [isAuthenticated, fetchChats]);

  const selectedChatRef = useRef(selectedChat);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    const API_DOMAIN = '127.0.0.1:8000'; // Ajustar según entorno
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProtocol}//${API_DOMAIN}/ws/user/${user.id}/`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.action === 'new_message') {
        const chatId = data.chat_id;
        if (selectedChatRef.current?.id === chatId) {
          fetchMensajes(chatId, true);
        } else {
          fetchChats();
        }
      }
    };

    return () => {
      ws.close();
    };
  }, [isAuthenticated, user?.id, fetchMensajes, fetchChats]);

  useEffect(() => {
    if (!selectedChat) return;
    fetchMensajes(selectedChat.id);
    checkBloqueo(selectedChat);
  }, [selectedChat?.id, selectedChat, fetchMensajes, checkBloqueo]);

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
        inmueble: selectedChat.inmueble
      });
      const newChat = res.data;
      setSelectedChat(newChat);
      setChats(prev => [newChat, ...prev.filter(c => c.id !== 'temp')]);
      return newChat.id;
    } catch (e) {
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
        tipo_mensaje: tipo,
        contenido: msg,
      });
      setNuevoMsg('');
      setShowEmojis(false);
      fetchMensajes(currentChatId);
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
    formData.append('tipo_mensaje', tipo);
    formData.append('contenido', file.name);
    formData.append('archivo', file);
    
    try {
      await api.post('/usuarios/mensajes/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchMensajes(currentChatId);
    } catch (e) {
      alert('Error subiendo archivo');
    }
    e.target.value = '';
  };

  const handleSendLocation = async () => {
    if (!window.confirm('¿Deseas compartir tu ubicación actual en este chat?')) return;
    if (!navigator.geolocation) return alert('Tu navegador no soporta geolocalización');
    const currentChatId = await ensureChatExists();
    if (!currentChatId) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const gps = `${pos.coords.latitude}, ${pos.coords.longitude}`;
        api.post('/usuarios/mensajes/', {
          chat: currentChatId,
          tipo_mensaje: 'ubicacion',
          contenido: '📍 Ubicación compartida',
          ubicacion_gps: gps,
        }).then(() => fetchMensajes(currentChatId));
      },
      () => alert('Error obteniendo ubicación')
    );
  };

  const handleBlockToggle = async () => {
    const otherUserId = selectedChat.participante1 === user.id ? selectedChat.participante2 : selectedChat.participante1;
    try {
      const res = await api.post('/usuarios/bloqueos/toggle/', { bloqueado: otherUserId });
      setIsBlocked(res.data.bloqueado);
      fetchChats();
    } catch (e) { /* ignore */ }
  };
  
  const handleDeleteChat = async () => {
    if (!window.confirm('¿Estás seguro de eliminar este chat para todos?')) return;
    try {
      await api.delete(`/usuarios/chats/${selectedChat.id}/`);
      setSelectedChat(null);
      fetchChats();
    } catch (e) { alert('Error al eliminar chat'); }
  };

  // Funciones de nuevo chat eliminadas a petición del usuario.

  const getOtherName = (chat) => {
    return chat.participante1 === user?.id ? chat.participante2_nombre : chat.participante1_nombre;
  };

  const getOtherUsername = (chat) => {
    return chat.participante1 === user?.id ? chat.participante2_username : chat.participante1_username;
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Hoy';
    const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
  };

  if (!isAuthenticated) return <div className="propiedades-page"><Navbar /><div className="propiedades-empty">Inicia sesión para ver tus mensajes</div></div>;

  return (
    <div className="propiedades-page">
      <Navbar />
      <UserMenu />
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', flex: 1 }}>
        <div style={{ display: 'flex', gap: '0', height: 'calc(100vh - 220px)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          
          {/* LISTA DE CHATS */}
          <div style={{ width: '340px', borderRight: '1px solid var(--color-border)', background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>Chats</h2>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? <div style={{ padding: '24px', textAlign: 'center', color: '#aaa' }}>Cargando...</div> :
              chats.length === 0 ? <div style={{ padding: '24px', textAlign: 'center', color: '#aaa' }}>No tienes chats aún</div> :
              chats.map(chat => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  style={{
                    padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                    background: selectedChat?.id === chat.id ? 'rgba(14,165,233,0.08)' : 'transparent',
                    transition: 'background 0.15s',
                    display: 'flex', alignItems: 'center', gap: '12px'
                  }}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>
                    {getOtherName(chat)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' }}>{getOtherName(chat)}</span>
                      {chat.ultimo_mensaje && (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{formatDate(chat.ultimo_mensaje.creado)}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                        {chat.ultimo_mensaje?.contenido || (chat.inmueble_titulo ? `Sobre: ${chat.inmueble_titulo}` : 'Sin mensajes')}
                      </span>
                      {chat.no_leidos > 0 && (
                        <span style={{ background: '#0ea5e9', color: '#fff', fontSize: '0.65rem', fontWeight: 700, borderRadius: '10px', padding: '2px 6px', minWidth: '18px', textAlign: 'center' }}>
                          {chat.no_leidos}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ÁREA DE CHAT */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
            {!selectedChat ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8' }}>
                <MessageSquare size={64} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                <p style={{ fontSize: '1.1rem' }}>Selecciona un chat para comenzar</p>
              </div>
            ) : (
              <>
                {/* Header del chat */}
                <div style={{ 
                  padding: '14px 20px', borderBottom: '1px solid var(--color-border)', background: '#fff',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                      {getOtherName(selectedChat)?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{getOtherName(selectedChat)}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        @{getOtherUsername(selectedChat)}
                        {selectedChat.inmueble_titulo && selectedChat.inmueble && (
                           <> · <Link to={`/propiedades/${selectedChat.inmueble}`} style={{ color: '#0ea5e9', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }} title="Ver Propiedad">
                             <Home size={14} /> {selectedChat.inmueble_titulo}
                           </Link></>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleBlockToggle}
                      style={{
                        background: isBlocked ? '#ef4444' : '#f1f5f9', color: isBlocked ? '#fff' : '#64748b',
                        border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem',
                        fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      {isBlocked ? <ShieldOff size={16} /> : <Shield size={16} />}
                      {isBlocked ? 'Desbloquear' : 'Bloquear'}
                    </button>
                    <button
                      onClick={handleDeleteChat}
                      style={{
                        background: '#fee2e2', color: '#dc2626',
                        border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem',
                        fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <Trash2 size={16} /> Eliminar
                    </button>
                  </div>
                </div>

                {/* Mensajes */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {mensajes.map((msg) => {
                    const isMine = msg.remitente === user?.id;
                    return (
                      <div key={msg.id} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                        <div style={{
                          background: isMine ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : '#fff',
                          color: isMine ? '#fff' : '#1e293b',
                          padding: '10px 14px', borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)', wordBreak: 'break-word'
                        }}>
                          {msg.tipo_mensaje === 'imagen' && msg.archivo_url && (
                            <img src={msg.archivo_url} alt="Imagen" style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '4px' }} />
                          )}
                          {msg.tipo_mensaje === 'video' && msg.archivo_url && (
                            <video src={msg.archivo_url} controls style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '4px' }} />
                          )}
                          {msg.tipo_mensaje === 'ubicacion' && msg.ubicacion_gps && (
                            <a
                              href={`https://www.google.com/maps?q=${msg.ubicacion_gps.replace(' ', '')}`}
                              target="_blank" rel="noreferrer"
                              style={{ display: 'block', background: isMine ? 'rgba(255,255,255,0.15)' : '#f0f9ff', padding: '8px 12px', borderRadius: '8px', marginBottom: '4px', textDecoration: 'none', color: isMine ? '#fff' : '#0ea5e9', fontWeight: 600 }}
                            >
                              📍 Ver ubicación en Google Maps
                            </a>
                          )}
                          <div style={{ fontSize: '0.92rem' }}>{msg.contenido}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: isMine ? 'flex-end' : 'flex-start', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{formatTime(msg.creado)}</span>
                          {isMine && (
                            <span style={{ fontSize: '0.7rem', color: msg.leido ? '#0ea5e9' : '#cbd5e1' }}>
                              {msg.leido ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={msgEndRef} />
                </div>

                {/* Input area */}
                {(isBlocked || blockedByOther) ? (
                  <div style={{ padding: '16px 20px', background: '#fef2f2', textAlign: 'center', color: '#dc2626', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <ShieldOff size={18} /> {isBlocked ? 'Has bloqueado a este usuario' : 'Este usuario te ha bloqueado'}
                  </div>
                ) : (
                  <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', background: '#fff', position: 'relative' }}>
                    {showEmojis && (
                      <div style={{ position: 'absolute', bottom: '100%', left: '20px', marginBottom: '10px', zIndex: 50, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                        <EmojiPicker onEmojiClick={(emojiData) => setNuevoMsg(prev => prev + emojiData.emoji)} />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                      <button onClick={() => setShowEmojis(prev => !prev)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Emojis"
                      ><Smile size={22} color="#64748b" /></button>
                      <button onClick={() => fileInputRef.current?.click()}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Adjuntar archivo"
                      ><Paperclip size={22} color="#64748b" /></button>
                      <button onClick={handleSendLocation}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Enviar ubicación"
                      ><MapPin size={22} color="#64748b" /></button>
                      <input type="file" ref={fileInputRef} onChange={handleSendFile} accept="image/*,video/*" style={{ display: 'none' }} />
                      <input
                        type="text"
                        value={nuevoMsg}
                        onChange={e => setNuevoMsg(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder="Escribe un mensaje..."
                        style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: '24px', padding: '10px 18px', fontSize: '0.92rem', outline: 'none', transition: 'border 0.2s' }}
                        onFocus={e => e.target.style.borderColor = '#0ea5e9'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                      <button onClick={() => handleSend()}
                        style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                      ><Send size={18} style={{ marginLeft: '2px' }} /></button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default MisMensajes;
