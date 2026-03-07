import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getComments, addComment, deleteComment } from '../api/posts';

export default function PostCard({ post, currentUser, onLike, onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const handleToggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await getComments(post.id);
        setComments(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(prev => !prev);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const res = await addComment(post.id, commentText);
      setComments(prev => [...prev, {
        ...res.data,
        author_name: currentUser.name,
        author_avatar: currentUser.avatar,
      }]);
      setCommentText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to={`/profile/${post.author_id}`} className="flex items-center gap-2">
          <img
            src={post.author_avatar || 'https://i.pravatar.cc/40'}
            className="w-9 h-9 rounded-full object-cover"
          />
          <div>
            <p className="text-sm font-medium">{post.author_name}</p>
            <p className="text-xs text-gray-400">
              {new Date(post.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
        </Link>
        {post.author_id === currentUser?.id && (
          <button
            onClick={() => onDelete(post.id)}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Supprimer
          </button>
        )}
      </div>

      {/* Contenu */}
      {post.content && (
        <p className="text-sm text-gray-800">{post.content}</p>
      )}

      {/* Images */}
      {post.images?.length > 0 && (
        <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
          {post.images.filter(Boolean).map((url, i) => (
            <img
              key={i}
              src={url}
              className="w-full object-cover max-h-60"
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-1 border-t border-gray-100">
        <button
          onClick={() => onLike(post.id)}
          className={`text-sm flex items-center gap-1 transition ${
            post.liked_by_me ? 'text-blue-500 font-medium' : 'text-gray-500 hover:text-blue-500'
          }`}
        >
          👍 {post.likes_count || 0}
        </button>
        <button
          onClick={handleToggleComments}
          className="text-sm text-gray-500 hover:text-blue-500 flex items-center gap-1 transition"
        >
          💬 {post.comments_count || 0}
        </button>
      </div>

      {/* Commentaires */}
      {showComments && (
        <div className="space-y-2 pt-1">
          {loadingComments ? (
            <p className="text-xs text-gray-400">Chargement...</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex items-start gap-2">
                <img
                  src={c.author_avatar || 'https://i.pravatar.cc/30'}
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
                <div className="bg-gray-100 rounded-lg px-3 py-1.5 flex-1">
                  <p className="text-xs font-medium">{c.author_name}</p>
                  <p className="text-sm">{c.content}</p>
                </div>
                {c.author_id === currentUser?.id && (
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0"
                  >✕</button>
                )}
              </div>
            ))
          )}

          {/* Ajouter un commentaire */}
          <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Ajouter un commentaire..."
              className="flex-1 border border-gray-200 rounded-full px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="text-sm text-blue-500 font-medium disabled:opacity-40"
            >
              Envoyer
            </button>
          </form>
        </div>
      )}
    </div>
  );
}