import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUser } from '../api/users';
import { getUserPosts, likePost, deletePost } from '../api/posts';
import { sendFriendRequest, acceptFriendRequest, removeFriend } from '../api/friends';
import { startConversation } from '../api/messages';
import PostCard from '../components/PostCard';

export default function Profile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const targetId = parseInt(id);
  const isMe = me?.id === targetId;

  useEffect(() => {
    setLoadingProfile(true);
    setPosts([]);
    setProfile(null);
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      const res = await getUser(targetId);
      setProfile(res.data);
      if (res.data.relation === 'friends' || me?.id === targetId) {
        setLoadingPosts(true);
        try {
          const postsRes = await getUserPosts(targetId);
          setPosts(postsRes.data);
        } catch (err) { console.error(err); }
        finally { setLoadingPosts(false); }
      }
    } catch (err) { console.error(err); }
    finally { setLoadingProfile(false); }
  };

  const handleFriendAction = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      const { relation } = profile;
      if (relation === 'none') {
        await sendFriendRequest(targetId);
        setProfile(p => ({ ...p, relation: 'pending_sent' }));
      } else if (relation === 'pending_received') {
        await acceptFriendRequest(targetId);
        setProfile(p => ({ ...p, relation: 'friends', friends_count: p.friends_count + 1 }));
        setLoadingPosts(true);
        const postsRes = await getUserPosts(targetId);
        setPosts(postsRes.data);
        setLoadingPosts(false);
      } else if (relation === 'friends' || relation === 'pending_sent') {
        await removeFriend(targetId);
        setProfile(p => ({
          ...p, relation: 'none',
          friends_count: relation === 'friends' ? Math.max(0, p.friends_count - 1) : p.friends_count,
        }));
        setPosts([]);
      }
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleMessage = async () => {
    try {
      await startConversation(targetId);
      navigate(`/messages?with=${targetId}`);
    } catch (err) { console.error(err); }
  };

  const handleLike = async (postId) => {
    try {
      const res = await likePost(postId);
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p, liked_by_me: res.data.liked,
        likes_count: res.data.liked ? Number(p.likes_count) + 1 : Math.max(0, Number(p.likes_count) - 1),
      } : p));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (postId) => {
    try {
      await deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) { console.error(err); }
  };

  if (loadingProfile) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
      <div className="spinner" />
    </div>
  );

  if (!profile) return (
    <div className="card empty-state">
      <span className="icon">🔍</span>
      <h3>Utilisateur introuvable</h3>
    </div>
  );

  const friendBtnConfig = {
    none:             { label: '+ Ajouter',          cls: 'btn-primary' },
    pending_sent:     { label: 'Demande envoyée',    cls: 'btn-ghost' },
    pending_received: { label: '✓ Accepter',         cls: 'btn-green' },
    friends:          { label: '✓ Amis',             cls: 'btn-ghost' },
  };
  const btn = friendBtnConfig[profile.relation] || friendBtnConfig.none;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Profile card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Banner */}
        <div style={{
          height: '110px',
          background: `linear-gradient(135deg, #1a2f5e 0%, #0f1c3d 50%, #1a1f35 100%)`,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(ellipse at 30% 50%, rgba(79,142,247,.2) 0%, transparent 60%)`,
          }} />
        </div>

        <div style={{ padding: '0 20px 20px' }}>
          {/* Avatar overlap */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '-28px', marginBottom: '14px' }}>
            <div style={{
              border: '3px solid var(--bg2)',
              borderRadius: '50%',
              background: 'var(--bg2)',
            }}>
              <img src={profile.avatar || 'https://i.pravatar.cc/88'}
                className="avatar" style={{ width: 80, height: 80 }} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', paddingBottom: '4px' }}>
              {!isMe && (
                <>
                  <button onClick={handleMessage} className="btn btn-ghost" style={{ fontSize: '13px' }}>
                    💬 Message
                  </button>
                  <button
                    onClick={handleFriendAction}
                    disabled={actionLoading}
                    className={`btn ${btn.cls}`}
                    style={{ fontSize: '13px' }}
                  >
                    {actionLoading ? '...' : btn.label}
                  </button>
                </>
              )}
              {isMe && (
                <Link to="/settings" className="btn btn-ghost" style={{ fontSize: '13px' }}>
                  ✏️ Modifier
                </Link>
              )}
            </div>
          </div>

          {/* Name & bio */}
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
            {profile.name}
          </h1>
          {profile.bio && (
            <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '10px', lineHeight: 1.5 }}>
              {profile.bio}
            </p>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--text-3)' }}>
            <span>
              <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{profile.friends_count}</strong> ami{profile.friends_count !== 1 ? 's' : ''}
            </span>
            <span>
              Membre depuis <strong style={{ color: 'var(--text-2)' }}>
                {new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Posts section */}
      {loadingPosts ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <div className="spinner" />
        </div>
      ) : profile.relation === 'none' && !isMe ? (
        <div className="card empty-state">
          <span className="icon">🔒</span>
          <h3>Publications privées</h3>
          <p>Ajoutez {profile.name} comme ami pour voir ses publications</p>
        </div>
      ) : profile.relation === 'pending_sent' ? (
        <div className="card empty-state">
          <span className="icon">⏳</span>
          <h3>Demande en attente</h3>
          <p>Vous pourrez voir les publications une fois acceptée</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="card empty-state">
          <span className="icon">📝</span>
          <h3>Aucune publication</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {posts.map(post => (
            <PostCard key={post.id} post={post} currentUser={me} onLike={handleLike} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}