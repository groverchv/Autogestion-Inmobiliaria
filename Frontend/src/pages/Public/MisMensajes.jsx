import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import UserMenu from '../../components/UserMenu';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import './Propiedades.css';

const MisMensajes = () => {
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultChatId = searchParams.get('chatId');
  const draftInmuebleId = searchParams.get('inmuebleId');
  const draftPropietarioId = searchParams.get('propietarioId');
  const draftPropietarioNombre = searchParams.get('propietarioNombre');
  const draftInmuebleTitulo = searchParams.get('inmuebleTitulo');

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  
  const messagesEndRef = useRef(null);

  // Cargar lista de chats
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, defaultChatId, draftInmuebleId]);

  const fetchChats = async () => {
    try {
      const res = await api.get('/usuarios/chats/');
      let fetchedChats = res.data.results || res.data;
      
      // Si venimos con un chatId en la URL, intentamos abrirlo
      if (defaultChatId) {
        const chat = fetchedChats.find(c => c.id.toString() === defaultChatId);
        if (chat) {
          openChat(chat);
        }
      } 
      // Si venimos desde contactar un inmueble, buscar si ya existe el chat
      else if (draftInmuebleId && draftPropietarioId) {
        const existingChat = fetchedChats.find(c => 
          c.inmueble?.toString() === draftInmuebleId &&
          (c.participante1?.toString() === draftPropietarioId || c.participante2?.toString() === draftPropietarioId)
        );
        
        if (existingChat) {
          openChat(existingChat);
        } else {
          // Crear un chat temporal "draft" en memoria
          const draftChat = {
            id: 'draft',
            participante1: user.id,
            participante2: parseInt(draftPropietarioId),
            participante2_nombre: draftPropietarioNombre,
            inmueble: parseInt(draftInmuebleId),
            inmueble_titulo: draftInmuebleTitulo
          };
          setActiveChat(draftChat);
          setMensajes([]);
        }
      }
      setChats(fetchedChats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChats(false);
    }
  };

  // Cargar mensajes de un chat específico
  const openChat = async (chat) => {
    setActiveChat(chat);
    if (chat.id === 'draft') {
      setMensajes([]);
      return;
    }
    
    try {
      const res = await api.get(`/usuarios/chats/${chat.id}/mensajes/`);
      setMensajes(res.data);
      scrollToBottom();
      
      // Actualizar la lista para quitar notificaciones hipotéticas
      setChats(prev => prev.map(c => c.id === chat.id ? { ...c, ultimo_mensaje: { ...c.ultimo_mensaje, leido: true } } : c));
    } catch (err) {
      console.error(err);
    }
  };

  // Enviar mensaje
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !activeChat) return;

    try {
      let currentChatId = activeChat.id;
      let currentChatObj = activeChat;

      // Si es un draft, crearlo fisicamente en BD primero
      if (currentChatId === 'draft') {
        const resChat = await api.post('/usuarios/chats/', {
          participante1: activeChat.participante1,
          participante2: activeChat.participante2,
          inmueble: activeChat.inmueble
        });
        currentChatId = resChat.data.id;
        currentChatObj = resChat.data;
        setActiveChat(resChat.data);
        // Agregarlo a la lista de chats visual
        setChats(prev => [resChat.data, ...prev]);
      }

      const res = await api.post('/usuarios/mensajes/', {
        chat: currentChatId,
        contenido: nuevoMensaje
      });
      
      setMensajes(prev => [...prev, res.data]);
      setNuevoMensaje('');
      scrollToBottom();
      
      // Actualizar el ultimo mensaje en la lista de chats
      setChats(prev => {
        let exists = prev.find(c => c.id === currentChatId);
        if (exists) {
            return prev.map(c => c.id === currentChatId ? { ...c, ultimo_mensaje: res.data } : c);
        }
        return [{...currentChatObj, ultimo_mensaje: res.data}, ...prev];
      });
    } catch (err) {
      console.error(err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="propiedades-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Navbar />

      {isAuthenticated && user?.rol !== 'admin' && (
        <UserMenu />
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '24px', gap: '24px' }}>
        
        {/* Lado izquierdo: Lista de Chats */}
        <div style={{ width: '350px', background: '#fff', borderRadius: '16px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-text)' }}>Mensajes</h2>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingChats ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Cargando chats...</div>
            ) : chats.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No tienes mensajes.</div>
            ) : (
              chats.map(chat => {
                // Determinar el nombre del otro participante
                const isParticipante1 = chat.participante1 === user?.id;
                const otherName = isParticipante1 ? chat.participante2_nombre : chat.participante1_nombre;
                
                return (
                  <div 
                    key={chat.id} 
                    onClick={() => openChat(chat)}
                    style={{ 
                      padding: '16px 20px', 
                      borderBottom: '1px solid var(--color-border)', 
                      cursor: 'pointer',
                      background: activeChat?.id === chat.id ? 'var(--color-bg-hover)' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--color-text)' }}>{otherName}</strong>
                      {chat.ultimo_mensaje && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {new Date(chat.ultimo_mensaje.creado).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {chat.inmueble_titulo && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginBottom: '4px', fontWeight: 600 }}>
                        {chat.inmueble_titulo}
                      </div>
                    )}
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {chat.ultimo_mensaje ? chat.ultimo_mensaje.contenido : 'Sin mensajes aún.'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Lado derecho: Ventana de Chat */}
        <div style={{ flex: 1, background: '#fff', borderRadius: '16px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeChat ? (
            <>
              {/* Header de chat */}
              <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--color-text)' }}>
                    {activeChat.participante1 === user?.id ? activeChat.participante2_nombre : activeChat.participante1_nombre}
                  </h3>
                  {activeChat.inmueble_titulo && (
                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Ref: {activeChat.inmueble_titulo}</span>
                  )}
                </div>
              </div>

              {/* Mensajes */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#fafafa' }}>
                {mensajes.map(msg => {
                  const isMine = msg.remitente === user?.id;
                  return (
                    <div key={msg.id} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                      <div style={{
                        background: isMine ? 'var(--color-primary)' : '#e5e7eb',
                        color: isMine ? '#fff' : 'var(--color-text)',
                        padding: '10px 16px',
                        borderRadius: '16px',
                        borderBottomRightRadius: isMine ? '4px' : '16px',
                        borderBottomLeftRadius: isMine ? '16px' : '4px',
                      }}>
                        {msg.contenido}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px', textAlign: isMine ? 'right' : 'left' }}>
                        {new Date(msg.creado).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} style={{ padding: '16px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '8px', background: '#fff' }}>
                <input
                  type="text"
                  value={nuevoMensaje}
                  onChange={e => setNuevoMensaje(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid var(--color-border)', outline: 'none', background: 'var(--color-bg)' }}
                />
                <button 
                  type="submit" 
                  disabled={!nuevoMensaje.trim()}
                  style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '24px', padding: '0 24px', fontWeight: 600, cursor: nuevoMensaje.trim() ? 'pointer' : 'not-allowed', opacity: nuevoMensaje.trim() ? 1 : 0.6 }}
                >
                  Enviar
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
              <div style={{ textAlign: 'center' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px', opacity: 0.5 }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>Selecciona una conversación para empezar a chatear</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MisMensajes;
