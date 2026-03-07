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

      // Charger les posts si on est ami ou c'est notre propre profil
      if (res.data.relation === 'friends' || me?.id === targetId) {
        setLoadingPosts(true);
        try {
          const postsRes = await getUserPosts(targetId);
          setPosts(postsRes.data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingPosts(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProfile(false);
    }
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
        // Charger les posts maintenant qu'on est amis
        setLoadingPosts(true);
        const postsRes = await getUserPosts(targetId);
        setPosts(postsRes.data);
        setLoadingPosts(false);
      } else if (relation === 'friends' || relation === 'pending_sent') {
        await removeFriend(targetId);
        setProfile(p => ({
          ...p,
          relation: 'none',
          friends_count: relation === 'friends' ? Math.max(0, p.friends_count - 1) : p.friends_count,
        }));
        setPosts([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = async () => {
    try {
      await startConversation(targetId);
      navigate(`/messages?with=${targetId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await likePost(postId);
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p,
        liked_by_me: res.data.liked,
        likes_count: res.data.liked
          ? Number(p.likes_count) + 1
          : Math.max(0, Number(p.likes_count) - 1),
      } : p));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (postId) => {
    try {
      await deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingProfile) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="text-center py-16 text-gray-400">Utilisateur introuvable</div>
  );

  const friendButtonConfig = {
    none:             { label: '+ Ajouter', style: 'bg-blue-500 text-white hover:bg-blue-600' },
    pending_sent:     { label: 'Demande envoyée', style: 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500' },
    pending_received: { label: 'Accepter la demande', style: 'bg-green-500 text-white hover:bg-green-600' },
    friends:          { label: '✓ Amis', style: 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500' },
  };

  const btn = friendButtonConfig[profile.relation] || friendButtonConfig.none;

  return (
    <div className="space-y-4">

      {/* ─── Carte profil ─── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">

        {/* Bannière */}
        <div className="h-32 bg-gradient-to-r from-blue-400 to-indigo-500" />

        {/* Avatar + infos */}
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-10 mb-3">
            <img
              src={profile.avatar || 'https://i.pravatar.cc/96'}
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow"
            />

            {/* Actions */}
            {!isMe && (
              <div className="flex gap-2 mt-10">
                <button
                  onClick={handleMessage}
                  className="text-sm px-4 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
                >
                  💬 Message
                </button>
                <button
                  onClick={handleFriendAction}
                  disabled={actionLoading}
                  className={`text-sm px-4 py-1.5 rounded-full transition font-medium ${btn.style} disabled:opacity-50`}
                >
                  {actionLoading ? '...' : btn.label}
                </button>
              </div>
            )}

            {isMe && (
              <div className="mt-10">
                <Link
                  to="/settings"
                  className="text-sm px-4 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
                >
                  ✏️ Modifier le profil
                </Link>
              </div>
            )}
          </div>

          <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>

          {profile.bio && (
            <p className="text-sm text-gray-500 mt-1">{profile.bio}</p>
          )}

          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span>👥 <strong className="text-gray-800">{profile.friends_count}</strong> ami{profile.friends_count !== 1 ? 's' : ''}</span>
            <span>📅 Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* ─── Publications ─── */}
      <div>
        {loadingPosts ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profile.relation === 'none' && !isMe ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center">
            <p className="text-2xl mb-2">🔒</p>
            <p className="font-medium text-gray-700">Publications privées</p>
            <p className="text-sm text-gray-400 mt-1">Ajoutez {profile.name} comme ami pour voir ses publications</p>
          </div>
        ) : profile.relation === 'pending_sent' ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center">
            <p className="text-2xl mb-2">⏳</p>
            <p className="font-medium text-gray-700">Demande en attente</p>
            <p className="text-sm text-gray-400 mt-1">Vous pourrez voir les publications une fois la demande acceptée</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center">
            <p className="text-2xl mb-2">📝</p>
            <p className="font-medium text-gray-700">Aucune publication</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={me}
                onLike={handleLike}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}