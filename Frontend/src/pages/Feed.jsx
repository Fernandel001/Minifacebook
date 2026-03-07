import { useEffect, useState } from 'react';
import { getFeed, createPost, likePost, deletePost } from '../api/posts';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import PostCard from '../components/PostCard';

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
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
    if (!content.trim() && !image) return;
    setPosting(true);

    try {
      const formData = new FormData();
      if (content.trim()) formData.append('content', content);
      if (image) formData.append('images', image);

      const res = await createPost(formData);
      setPosts(prev => [res.data, ...prev]);
      setContent('');
      setImage(null);
      setImagePreview(null);
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

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
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

            {/* Preview image */}
            {imagePreview && (
              <div style={{ position: 'relative', display: 'inline-block', marginTop: '10px' }}>
                <img src={imagePreview} style={{
                  maxHeight: '160px', maxWidth: '100%', borderRadius: '10px',
                  border: '1px solid var(--border)', objectFit: 'cover', display: 'block',
                }} />
                <button
                  type="button"
                  onClick={removeImage}
                  style={{
                    position: 'absolute', top: '6px', right: '6px',
                    background: 'rgba(0,0,0,.7)', border: 'none', color: '#fff',
                    borderRadius: '50%', width: '22px', height: '22px',
                    cursor: 'pointer', fontSize: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >✕</button>
              </div>
            )}

            {/* Footer actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer',
                padding: '6px 10px', borderRadius: '8px', transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; }}
              >
                📷 Photo
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                />
              </label>

              <button
                type="submit"
                disabled={posting || (!content.trim() && !image)}
                style={{
                  background: 'var(--accent)', color: '#fff',
                  border: 'none', borderRadius: '99px',
                  padding: '8px 20px', fontSize: '13.5px', fontWeight: 600,
                  fontFamily: 'var(--font-ui)', cursor: 'pointer',
                  transition: 'all .18s', opacity: (posting || (!content.trim() && !image)) ? .4 : 1,
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