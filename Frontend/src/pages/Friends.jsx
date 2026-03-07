import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFriends, acceptFriendRequest, removeFriend } from '../api/friends';

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('friends');

  useEffect(() => { loadFriends(); }, []);

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
      if (accepted) setFriends(prev => [...prev, { ...accepted, friends_since: new Date().toISOString() }]);
    } catch (err) { console.error(err); }
  };

  const handleRemove = async (userId) => {
    try {
      await removeFriend(userId);
      setFriends(prev => prev.filter(f => f.id !== userId));
      setSent(prev => prev.filter(f => f.id !== userId));
      setReceived(prev => prev.filter(f => f.id !== userId));
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
      <div className="spinner" />
    </div>
  );

  const tabs = [
    { key: 'friends',  label: 'Amis',     count: friends.length },
    { key: 'received', label: 'Reçues',   count: received.length },
    { key: 'sent',     label: 'Envoyées', count: sent.length },
  ];

  const current = { friends, received, sent }[activeTab];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '22px', fontWeight: 700 }}>Amis</h1>
        {received.length > 0 && (
          <span className="badge">{received.length} nouvelle{received.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                fontSize: '11px', fontWeight: 700,
                padding: '1px 6px', borderRadius: '99px',
                background: activeTab === tab.key ? 'rgba(255,255,255,.25)' : 'var(--border)',
                color: activeTab === tab.key ? '#fff' : 'var(--text-2)',
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {current.length === 0 ? (
        <div className="card empty-state">
          <span className="icon">
            {activeTab === 'friends' ? '👥' : activeTab === 'received' ? '📬' : '📮'}
          </span>
          <h3>
            {activeTab === 'friends' ? 'Aucun ami pour l\'instant' :
             activeTab === 'received' ? 'Aucune demande reçue' : 'Aucune demande envoyée'}
          </h3>
          <p>
            {activeTab === 'friends' ? 'Utilisez la recherche pour trouver des personnes' :
             activeTab === 'received' ? 'Vous n\'avez pas de nouvelles demandes' : 'Aucune demande en attente'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {current.map(person => (
            <div key={person.id} className="card" style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 14px',
            }}>
              <Link to={`/profile/${person.id}`}>
                <img src={person.avatar || 'https://i.pravatar.cc/48'}
                  className="avatar" style={{ width: 46, height: 46 }} />
              </Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link to={`/profile/${person.id}`} style={{
                  fontSize: '14px', fontWeight: 600, color: 'var(--text)',
                  display: 'block',
                }}>
                  {person.name}
                </Link>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '1px' }}>
                  {activeTab === 'friends' &&
                    `Amis depuis ${new Date(person.friends_since).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`}
                  {activeTab === 'received' &&
                    `Le ${new Date(person.created_at).toLocaleDateString('fr-FR')}`}
                  {activeTab === 'sent' && 'En attente...'}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {activeTab === 'received' && (
                  <button onClick={() => handleAccept(person.id)} className="btn btn-green" style={{ fontSize: '12.5px', padding: '6px 12px' }}>
                    Accepter
                  </button>
                )}
                <button
                  onClick={() => handleRemove(person.id)}
                  className="btn btn-ghost"
                  style={{ fontSize: '12.5px', padding: '6px 12px', color: activeTab === 'friends' ? 'var(--red)' : 'var(--text-2)' }}
                >
                  {activeTab === 'friends' ? 'Retirer' : activeTab === 'received' ? 'Refuser' : 'Annuler'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}