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

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr);
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const S = {
    card: {
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    },
    header: {
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    authorLink: {
      display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none',
    },
    avatar: {
      width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
    },
    authorName: { fontSize: '14px', fontWeight: 600, color: 'var(--text)' },
    time: { fontSize: '12px', color: 'var(--text-3)', marginTop: '1px' },
    content: {
      padding: '0 16px 14px',
      fontSize: '14.5px', color: 'var(--text)', lineHeight: 1.65,
    },
    actionsBar: {
      display: 'flex', gap: '4px', padding: '6px 10px',
      borderTop: '1px solid var(--border)',
    },
    commentsSection: {
      borderTop: '1px solid var(--border)',
      padding: '14px 16px',
      background: 'rgba(0,0,0,.12)',
      display: 'flex', flexDirection: 'column', gap: '10px',
    },
    commentBubble: {
      flex: 1,
      background: 'var(--bg3)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '8px 12px',
    },
  };

  return (
    <div style={S.card}>

      {/* Header */}
      <div style={S.header}>
        <Link to={`/profile/${post.author_id}`} style={S.authorLink}>
          <img src={post.author_avatar || `https://i.pravatar.cc/40?u=${post.author_id}`} style={S.avatar} />
          <div>
            <div style={S.authorName}>{post.author_name}</div>
            <div style={S.time}>{timeAgo(post.created_at)}</div>
          </div>
        </Link>

        {post.author_id === currentUser?.id && (
          <button
            onClick={() => onDelete(post.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text-3)', padding: '5px 9px', borderRadius: '6px', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'rgba(245,101,101,.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'none'; }}
          >
            Supprimer
          </button>
        )}
      </div>

      {/* Texte */}
      {post.content && <div style={S.content}>{post.content}</div>}

      {/* Images */}
      {post.images?.filter(Boolean).length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: post.images.filter(Boolean).length === 1 ? '1fr' : '1fr 1fr',
          gap: '2px',
        }}>
          {post.images.filter(Boolean).map((url, i) => (
            <img key={i} src={url} style={{
              width: '100%', objectFit: 'cover', display: 'block',
              maxHeight: post.images.filter(Boolean).length === 1 ? '420px' : '220px',
            }} />
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={S.actionsBar}>
        <button
          onClick={() => onLike(post.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '99px', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600,
            background: post.liked_by_me ? 'var(--accent-dim)' : 'transparent',
            color: post.liked_by_me ? 'var(--accent)' : 'var(--text-2)',
            transition: 'all .15s',
          }}
          onMouseEnter={e => { if (!post.liked_by_me) e.currentTarget.style.background = 'var(--bg3)'; }}
          onMouseLeave={e => { if (!post.liked_by_me) e.currentTarget.style.background = 'transparent'; }}
        >
          👍 {Number(post.likes_count) || 0}
        </button>

        <button
          onClick={handleToggleComments}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '99px', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600,
            background: showComments ? 'var(--bg3)' : 'transparent',
            color: showComments ? 'var(--text)' : 'var(--text-2)',
            transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)'; }}
          onMouseLeave={e => { if (!showComments) e.currentTarget.style.background = 'transparent'; }}
        >
          💬 {Number(post.comments_count) || 0}
        </button>
      </div>

      {/* Commentaires */}
      {showComments && (
        <div style={S.commentsSection}>

          {loadingComments ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px' }}>
              <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <img src={c.author_avatar || `https://i.pravatar.cc/30?u=${c.author_id}`}
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: '1px' }} />
                <div style={S.commentBubble}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{c.author_name}</div>
                  <div style={{ fontSize: '13.5px', color: 'var(--text-2)' }}>{c.content}</div>
                </div>
                {c.author_id === currentUser?.id && (
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '14px', padding: '4px', marginTop: '4px', flexShrink: 0, transition: 'color .12s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                  >✕</button>
                )}
              </div>
            ))
          )}

          {/* Form commentaire */}
          <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <img src={currentUser?.avatar || `https://i.pravatar.cc/28?u=${currentUser?.id}`}
              style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Ajouter un commentaire..."
              style={{
                flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: '99px', color: 'var(--text)', padding: '7px 14px',
                fontSize: '13.5px', outline: 'none', fontFamily: 'var(--font-ui)',
                transition: 'border-color .15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              style={{
                background: commentText.trim() ? 'var(--accent)' : 'var(--bg3)',
                border: 'none', borderRadius: '99px', flexShrink: 0,
                color: commentText.trim() ? '#fff' : 'var(--text-3)',
                padding: '7px 14px', fontSize: '13px', fontWeight: 600,
                cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                fontFamily: 'var(--font-ui)', transition: 'all .15s',
              }}
            >
              Envoyer
            </button>
          </form>

        </div>
      )}
    </div>
  );
}