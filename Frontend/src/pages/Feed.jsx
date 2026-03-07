import { useEffect, useState } from 'react';
import { getFeed, createPost, likePost, deletePost } from '../api/posts';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const res = await getFeed();
      setPosts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);

    try {
      const formData = new FormData();
      formData.append('content', content);

      const res = await createPost(formData);
      setPosts(prev => [res.data, ...prev]);
      setContent('');
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
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
          : Math.max(0, Number(p.likes_count) - 1)
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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ── Compose box ── */}
      <form onSubmit={handlePost} style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px',
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <img
            src={user?.avatar || `https://i.pravatar.cc/40?u=${user?.id}`}
            style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: '2px' }}
          />
          <div style={{ flex: 1 }}>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Quoi de neuf ?"
              rows={2}
              className="compose-textarea"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="submit"
                disabled={posting || !content.trim()}
                style={{
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: '99px',
                  padding: '8px 20px', fontSize: '13.5px', fontWeight: 600,
                  fontFamily: 'var(--font-ui)', cursor: 'pointer',
                  transition: 'all .18s',
                  opacity: (posting || !content.trim()) ? .4 : 1,
                }}
                onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--accent-h)'; }}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
              >
                {posting ? 'Publication...' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ── Liste des posts ── */}
      {posts.length === 0 ? (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '60px 24px', gap: '10px', textAlign: 'center',
        }}>
          <span style={{ fontSize: '36px', opacity: .5 }}>✨</span>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>Votre fil est vide</div>
          <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>Ajoutez des amis pour voir leurs publications ici</div>
        </div>
      ) : (
        posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUser={user}
            onLike={handleLike}
            onDelete={handleDelete}
          />
        ))
      )}
    </div>
  );
}