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

  if (loading) return <div className="text-center py-10 text-gray-400">Chargement...</div>;

  return (
    <div className="space-y-4">

      {/* Formulaire de création */}
      <form onSubmit={handlePost} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex gap-3 items-start">
          <img
            src={user?.avatar || 'https://i.pravatar.cc/40'}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Quoi de neuf ?"
            rows={2}
            className="flex-1 resize-none border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="flex items-center justify-between pl-13">
          <label className="cursor-pointer text-sm text-gray-500 hover:text-blue-500 transition">
            📷 Photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => setImage(e.target.files[0])}
            />
          </label>
          {image && (
            <span className="text-xs text-gray-400 truncate max-w-xs">
              {image.name}
              <button
                type="button"
                onClick={() => setImage(null)}
                className="ml-2 text-red-400"
              >✕</button>
            </span>
          )}
          <button
            type="submit"
            disabled={posting || (!content.trim() && !image)}
            className="bg-blue-500 text-white text-sm px-4 py-1.5 rounded-full hover:bg-blue-600 disabled:opacity-40 transition"
          >
            {posting ? 'Publication...' : 'Publier'}
          </button>
        </div>
      </form>

      {/* Liste des posts */}
      {posts.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          Aucune publication. Ajoutez des amis pour voir leur contenu !
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