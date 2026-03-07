import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFriends, acceptFriendRequest, removeFriend } from '../api/friends';

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'received' | 'sent'

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const res = await getFriends();
      setFriends(res.data.friends);
      setReceived(res.data.received);
      setSent(res.data.sent);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requesterId) => {
    try {
      await acceptFriendRequest(requesterId);
      const accepted = received.find(r => r.id === requesterId);
      setReceived(prev => prev.filter(r => r.id !== requesterId));
      if (accepted) {
        setFriends(prev => [...prev, { ...accepted, friends_since: new Date().toISOString() }]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (userId) => {
    try {
      await removeFriend(userId);
      setFriends(prev => prev.filter(f => f.id !== userId));
      setSent(prev => prev.filter(f => f.id !== userId));
      setReceived(prev => prev.filter(f => f.id !== userId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const tabs = [
    { key: 'friends', label: 'Amis', count: friends.length },
    { key: 'received', label: 'Demandes reçues', count: received.length },
    { key: 'sent', label: 'Demandes envoyées', count: sent.length },
  ];

  return (
    <div className="space-y-4">

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-1 flex gap-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
              activeTab === tab.key
                ? 'bg-blue-500 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.key
                  ? 'bg-white/30 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenu */}

      {/* Amis confirmés */}
      {activeTab === 'friends' && (
        <div>
          {friends.length === 0 ? (
            <EmptyState
              emoji="👥"
              title="Aucun ami pour l'instant"
              subtitle="Utilisez la recherche pour trouver des personnes à ajouter"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {friends.map(friend => (
                <FriendCard
                  key={friend.id}
                  user={friend}
                  meta={`Amis depuis ${new Date(friend.friends_since).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`}
                  actions={
                    <button
                      onClick={() => handleRemove(friend.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition px-3 py-1.5 rounded-lg hover:bg-red-50"
                    >
                      Retirer
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Demandes reçues */}
      {activeTab === 'received' && (
        <div>
          {received.length === 0 ? (
            <EmptyState
              emoji="📬"
              title="Aucune demande reçue"
              subtitle="Vous n'avez pas de nouvelles demandes d'amitié"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {received.map(req => (
                <FriendCard
                  key={req.id}
                  user={req}
                  meta={`Envoyée le ${new Date(req.created_at).toLocaleDateString('fr-FR')}`}
                  actions={
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(req.id)}
                        className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition font-medium"
                      >
                        Accepter
                      </button>
                      <button
                        onClick={() => handleRemove(req.id)}
                        className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition"
                      >
                        Refuser
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Demandes envoyées */}
      {activeTab === 'sent' && (
        <div>
          {sent.length === 0 ? (
            <EmptyState
              emoji="📮"
              title="Aucune demande envoyée"
              subtitle="Vous n'avez pas de demandes en attente"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sent.map(req => (
                <FriendCard
                  key={req.id}
                  user={req}
                  meta="Demande en attente..."
                  actions={
                    <button
                      onClick={() => handleRemove(req.id)}
                      className="text-xs text-gray-500 hover:text-red-500 transition px-3 py-1.5 rounded-lg hover:bg-gray-100"
                    >
                      Annuler
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FriendCard({ user, meta, actions }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
      <Link to={`/profile/${user.id}`} className="shrink-0">
        <img
          src={user.avatar || 'https://i.pravatar.cc/48'}
          className="w-12 h-12 rounded-full object-cover hover:opacity-90 transition"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          to={`/profile/${user.id}`}
          className="text-sm font-medium hover:underline truncate block"
        >
          {user.name}
        </Link>
        <p className="text-xs text-gray-400 truncate">{meta}</p>
      </div>
      <div className="shrink-0">
        {actions}
      </div>
    </div>
  );
}

function EmptyState({ emoji, title, subtitle }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
      <div className="text-4xl mb-3">{emoji}</div>
      <p className="font-medium text-gray-700">{title}</p>
      <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}