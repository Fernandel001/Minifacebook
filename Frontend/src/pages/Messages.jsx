import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getConversations, getMessages, startConversation } from '../api/messages';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Link } from 'react-router-dom';

export default function Messages() {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null); // { conversation_id, other_user_name, other_user_avatar, other_user_id }
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Charger les conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Ouvrir une conv depuis l'URL (?with=userId)
  useEffect(() => {
    const targetId = searchParams.get('with');
    if (targetId) {
      handleStartConversation(parseInt(targetId));
    }
  }, [searchParams]);

  // Socket : écoute les nouveaux messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (activeConv && msg.conversation_id === activeConv.conversation_id) {
        setMessages(prev => [...prev, msg]);
        // Marque comme lu
        socket.emit('mark_read', { conversationId: activeConv.conversation_id });
      }
      // Met à jour la preview dans la liste
      setConversations(prev => prev.map(c =>
        c.conversation_id === msg.conversation_id
          ? { ...c, last_message: msg.content, last_message_at: msg.created_at, unread_count: activeConv?.conversation_id === msg.conversation_id ? 0 : Number(c.unread_count) + 1 }
          : c
      ));
    };

    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [socket, activeConv]);

  // Scroll automatique en bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await getConversations();
      setConversations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConvs(false);
    }
  };

  const handleSelectConv = async (conv) => {
    setActiveConv(conv);
    setLoadingMsgs(true);
    setMessages([]);

    try {
      const res = await getMessages(conv.conversation_id);
      setMessages(res.data);

      // Rejoindre la room socket
      socket?.emit('join_conversation', conv.conversation_id);
      socket?.emit('mark_read', { conversationId: conv.conversation_id });

      // Reset unread count
      setConversations(prev => prev.map(c =>
        c.conversation_id === conv.conversation_id ? { ...c, unread_count: 0 } : c
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMsgs(false);
      inputRef.current?.focus();
    }
  };

  const handleStartConversation = async (targetId) => {
    try {
      const res = await startConversation(targetId);
      const convId = res.data.conversation_id;
      // Recharge les conversations pour avoir les infos
      const convsRes = await getConversations();
      setConversations(convsRes.data);
      const conv = convsRes.data.find(c => c.conversation_id === convId);
      if (conv) handleSelectConv(conv);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || !activeConv || !socket) return;

    socket.emit('send_message', {
      conversationId: activeConv.conversation_id,
      content: input.trim(),
    });

    // Optimistic update
    setMessages(prev => [...prev, {
      id: Date.now(),
      conversation_id: activeConv.conversation_id,
      sender_id: user.id,
      content: input.trim(),
      created_at: new Date().toISOString(),
      sender_name: user.name,
      sender_avatar: user.avatar,
      optimistic: true,
    }]);

    setConversations(prev => prev.map(c =>
      c.conversation_id === activeConv.conversation_id
        ? { ...c, last_message: input.trim(), last_message_at: new Date().toISOString() }
        : c
    ));

    setInput('');
  };

  const isOnline = (userId) => onlineUsers.includes(userId);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden flex h-[calc(100vh-5rem)]" style={{ maxHeight: '700px' }}>

      {/* ─── Sidebar conversations ─── */}
      <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Messages</h2>
        </div>

        <div className="overflow-y-auto flex-1">
          {loadingConvs ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-2xl mb-2">💬</p>
              <p className="text-sm text-gray-400">Aucune conversation</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.conversation_id}
                onClick={() => handleSelectConv(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left ${
                  activeConv?.conversation_id === conv.conversation_id ? 'bg-blue-50' : ''
                }`}
              >
                {/* Avatar + indicateur en ligne */}
                <div className="relative shrink-0">
                  <img
                    src={conv.other_user_avatar || 'https://i.pravatar.cc/40'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {isOnline(conv.other_user_id) && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{conv.other_user_name}</p>
                    {conv.last_message_at && (
                      <span className="text-xs text-gray-400 shrink-0 ml-1">
                        {formatTime(conv.last_message_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 truncate">
                      {conv.last_sender_id === user.id ? 'Vous : ' : ''}{conv.last_message || 'Démarrer la conversation'}
                    </p>
                    {Number(conv.unread_count) > 0 && (
                      <span className="ml-1 shrink-0 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
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

      {/* ─── Zone de chat ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <p className="text-4xl mb-3">💬</p>
            <p className="font-medium text-gray-700">Sélectionnez une conversation</p>
            <p className="text-sm text-gray-400 mt-1">ou visitez le profil d'un ami pour lui écrire</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
              <div className="relative">
                <img
                  src={activeConv.other_user_avatar || 'https://i.pravatar.cc/40'}
                  className="w-9 h-9 rounded-full object-cover"
                />
                {isOnline(activeConv.other_user_id) && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
                )}
              </div>
              <div>
                <Link
                  to={`/profile/${activeConv.other_user_id}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {activeConv.other_user_name}
                </Link>
                <p className="text-xs text-gray-400">
                  {isOnline(activeConv.other_user_id) ? '🟢 En ligne' : 'Hors ligne'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">Aucun message. Dites bonjour ! 👋</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const isMe = msg.sender_id === user.id;
                    const showAvatar = !isMe && (i === 0 || messages[i - 1]?.sender_id !== msg.sender_id);

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                      >
                        {/* Avatar (interlocuteur seulement) */}
                        {!isMe && (
                          <div className="w-7 shrink-0">
                            {showAvatar && (
                              <img
                                src={msg.sender_avatar || 'https://i.pravatar.cc/28'}
                                className="w-7 h-7 rounded-full object-cover"
                              />
                            )}
                          </div>
                        )}

                        <div className={`max-w-[65%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div
                            className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                              isMe
                                ? 'bg-blue-500 text-white rounded-br-sm'
                                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                            } ${msg.optimistic ? 'opacity-70' : ''}`}
                          >
                            {msg.content}
                          </div>
                          <span className="text-xs text-gray-400 mt-0.5 px-1">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={`Message ${activeConv.other_user_name}...`}
                className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-600 disabled:opacity-40 transition"
              >
                ➤
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const oneDay = 86400000;

  if (diff < 60000) return 'À l\'instant';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
  if (diff < oneDay) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}