import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getConversations, getMessages, startConversation } from '../api/messages';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Messages() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showList, setShowList] = useState(true); // mobile toggle

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    const targetId = searchParams.get('with');
    if (targetId) handleStartConversation(parseInt(targetId));
  }, [searchParams]);

  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = (msg) => {
      if (activeConv && msg.conversation_id === activeConv.conversation_id) {
        setMessages(prev => [...prev, msg]);
        socket.emit('mark_read', { conversationId: activeConv.conversation_id });
      }
      setConversations(prev => prev.map(c =>
        c.conversation_id === msg.conversation_id
          ? { ...c, last_message: msg.content, last_message_at: msg.created_at,
              unread_count: activeConv?.conversation_id === msg.conversation_id ? 0 : Number(c.unread_count) + 1 }
          : c
      ));
    };
    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [socket, activeConv]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await getConversations();
      setConversations(res.data);
    } catch (err) { console.error(err); }
    finally { setLoadingConvs(false); }
  };

  const handleSelectConv = async (conv) => {
    setActiveConv(conv);
    setShowList(false);
    setLoadingMsgs(true);
    setMessages([]);
    try {
      const res = await getMessages(conv.conversation_id);
      setMessages(res.data);
      socket?.emit('join_conversation', conv.conversation_id);
      socket?.emit('mark_read', { conversationId: conv.conversation_id });
      setConversations(prev => prev.map(c =>
        c.conversation_id === conv.conversation_id ? { ...c, unread_count: 0 } : c
      ));
    } catch (err) { console.error(err); }
    finally { setLoadingMsgs(false); inputRef.current?.focus(); }
  };

  const handleStartConversation = async (targetId) => {
    try {
      await startConversation(targetId);
      const convsRes = await getConversations();
      setConversations(convsRes.data);
      const conv = convsRes.data.find(c => c.other_user_id === targetId);
      if (conv) handleSelectConv(conv);
    } catch (err) { console.error(err); }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !activeConv || !socket) return;
    socket.emit('send_message', { conversationId: activeConv.conversation_id, content: input.trim() });
    setMessages(prev => [...prev, {
      id: Date.now(), conversation_id: activeConv.conversation_id,
      sender_id: user.id, content: input.trim(),
      created_at: new Date().toISOString(), optimistic: true,
    }]);
    setConversations(prev => prev.map(c =>
      c.conversation_id === activeConv.conversation_id
        ? { ...c, last_message: input.trim(), last_message_at: new Date().toISOString(), last_sender_id: user.id }
        : c
    ));
    setInput('');
  };

  const isOnline = (userId) => onlineUsers.includes(userId);

  const formatTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr);
    if (diff < 60000) return 'maintenant';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <div style={{
      display: 'flex',
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      height: 'calc(100vh - 110px)',
      maxHeight: '680px',
      minHeight: '400px',
    }}>

      {/* ─── Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{
        width: '280px', flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        // Sur mobile: masqué si conv active
        ...((!showList && activeConv) ? { display: 'none' } : {}),
      }} className="conv-sidebar">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '16px', fontWeight: 700 }}>Messages</h2>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loadingConvs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
              <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 16px' }}>
              <span className="icon">💬</span>
              <h3>Aucune conversation</h3>
              <p>Visitez le profil d'un ami pour lui écrire</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button key={conv.conversation_id} onClick={() => handleSelectConv(conv)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '11px 14px', border: 'none', textAlign: 'left', cursor: 'pointer',
                  background: activeConv?.conversation_id === conv.conversation_id
                    ? 'var(--accent-dim)' : 'transparent',
                  borderLeft: activeConv?.conversation_id === conv.conversation_id
                    ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'all .12s',
                }}
                onMouseEnter={e => { if (activeConv?.conversation_id !== conv.conversation_id) e.currentTarget.style.background = 'var(--bg3)'; }}
                onMouseLeave={e => { if (activeConv?.conversation_id !== conv.conversation_id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={conv.other_user_avatar || 'https://i.pravatar.cc/40'}
                    className="avatar" style={{ width: 40, height: 40 }} />
                  {isOnline(conv.other_user_id) && (
                    <span style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: 10, height: 10, background: 'var(--green)',
                      borderRadius: '50%', border: '2px solid var(--bg2)',
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>
                      {conv.other_user_name}
                    </span>
                    {conv.last_message_at && (
                      <span style={{ fontSize: '11px', color: 'var(--text-3)', flexShrink: 0 }}>
                        {formatTime(conv.last_message_at)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.last_sender_id === user.id ? 'Vous : ' : ''}{conv.last_message || '—'}
                    </span>
                    {Number(conv.unread_count) > 0 && (
                      <span className="badge" style={{ marginLeft: '4px', flexShrink: 0, fontSize: '10px' }}>
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ─── Chat ────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
        ...(showList && !activeConv ? {} : {}),
      }}>
        {!activeConv ? (
          <div className="empty-state" style={{ flex: 1 }}>
            <span className="icon">💬</span>
            <h3>Sélectionnez une conversation</h3>
            <p>ou visitez le profil d'un ami pour lui écrire</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--bg2)',
            }}>
              {/* Bouton retour mobile */}
              <button onClick={() => setShowList(true)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-2)',
                  cursor: 'pointer', fontSize: '18px', padding: '0 4px',
                  display: 'none',
                }} className="back-btn">
                ←
              </button>

              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={activeConv.other_user_avatar || 'https://i.pravatar.cc/38'}
                  className="avatar" style={{ width: 36, height: 36 }} />
                {isOnline(activeConv.other_user_id) && (
                  <span style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 9, height: 9, background: 'var(--green)',
                    borderRadius: '50%', border: '2px solid var(--bg2)',
                  }} />
                )}
              </div>
              <div>
                <Link to={`/profile/${activeConv.other_user_id}`} style={{
                  fontSize: '14px', fontWeight: 600, color: 'var(--text)',
                }}>
                  {activeConv.other_user_name}
                </Link>
                <div style={{ fontSize: '11.5px', color: isOnline(activeConv.other_user_id) ? 'var(--green)' : 'var(--text-3)' }}>
                  {isOnline(activeConv.other_user_id) ? '● En ligne' : '○ Hors ligne'}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loadingMsgs ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                  <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                </div>
              ) : messages.length === 0 ? (
                <div className="empty-state">
                  <span className="icon">👋</span>
                  <p>Dites bonjour à {activeConv.other_user_name} !</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_id === user.id;
                  const showAvatar = !isMe && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);
                  return (
                    <div key={msg.id} style={{
                      display: 'flex', alignItems: 'flex-end', gap: '6px',
                      flexDirection: isMe ? 'row-reverse' : 'row',
                    }}>
                      <div style={{ width: 26, flexShrink: 0 }}>
                        {!isMe && showAvatar && (
                          <img src={msg.sender_avatar || 'https://i.pravatar.cc/26'}
                            className="avatar" style={{ width: 26, height: 26 }} />
                        )}
                      </div>
                      <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          padding: '9px 13px',
                          borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isMe ? 'var(--accent)' : 'var(--bg3)',
                          color: isMe ? '#fff' : 'var(--text)',
                          fontSize: '14px', lineHeight: 1.5,
                          border: isMe ? 'none' : '1px solid var(--border)',
                          opacity: msg.optimistic ? .7 : 1,
                        }}>
                          {msg.content}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px', padding: '0 4px' }}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={{
              padding: '12px 14px',
              borderTop: '1px solid var(--border)',
              display: 'flex', gap: '8px', alignItems: 'center',
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Message ${activeConv.other_user_name}...`}
                className="input input-pill"
                style={{ flex: 1, fontSize: '13.5px', padding: '9px 16px' }}
              />
              <button type="submit" disabled={!input.trim()} className="btn btn-primary"
                style={{ padding: '9px 16px', fontSize: '15px' }}>
                ➤
              </button>
            </form>
          </>
        )}
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 639px) {
          .conv-sidebar { width: 100% !important; display: flex !important; }
          .conv-sidebar[style*="display: none"] { display: none !important; }
          .back-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}