import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { search } from '../api/search';
import { sendFriendRequest, acceptFriendRequest, removeFriend } from '../api/friends';
import { startConversation } from '../api/messages';

export default function Search() {
  const { user: me } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const q = searchParams.get('q') || '';
  const [filter, setFilter] = useState('all');
  const [results, setResults] = useState({ people: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [localInput, setLocalInput] = useState(q);
  const [relations, setRelations] = useState({});

  useEffect(() => { setLocalInput(q); if (q) doSearch(q, filter); }, [q]);
  useEffect(() => { if (q) doSearch(q, filter); }, [filter]);

  const doSearch = async (query, f) => {
    setLoading(true); setSearched(true);
    try {
      const res = await search(query, f === 'all' ? undefined : f);
      setResults(res.data.results);
      const rel = {};
      res.data.results.people?.forEach(p => { rel[p.id] = p.relation; });
      setRelations(rel);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!localInput.trim()) return;
    navigate(`/search?q=${encodeURIComponent(localInput.trim())}`);
  };

  const handleFriendAction = async (person) => {
    const rel = relations[person.id] ?? person.relation;
    try {
      if (rel === 'none') { await sendFriendRequest(person.id); setRelations(p => ({ ...p, [person.id]: 'pending_sent' })); }
      else if (rel === 'pending_received') { await acceptFriendRequest(person.id); setRelations(p => ({ ...p, [person.id]: 'friends' })); }
      else if (rel === 'friends' || rel === 'pending_sent') { await removeFriend(person.id); setRelations(p => ({ ...p, [person.id]: 'none' })); }
    } catch (err) { console.error(err); }
  };

  const handleMessage = async (userId) => {
    try { await startConversation(userId); navigate(`/messages?with=${userId}`); }
    catch (err) { console.error(err); }
  };

  const btnConfig = {
    none:             { label: '+ Ajouter', cls: 'btn-primary' },
    pending_sent:     { label: 'Envoyée',   cls: 'btn-ghost' },
    pending_received: { label: 'Accepter',  cls: 'btn-green' },
    friends:          { label: '✓ Amis',    cls: 'btn-ghost' },
  };

  const people = results.people || [];
  const posts = results.posts || [];
  const hasResults = people.length > 0 || posts.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Search bar */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
        <input
          value={localInput}
          onChange={e => setLocalInput(e.target.value)}
          placeholder="Rechercher des personnes ou des publications..."
          autoFocus
          className="input"
          style={{ flex: 1, borderRadius: '99px', padding: '10px 18px' }}
        />
        <button type="submit" disabled={!localInput.trim()} className="btn btn-primary">
          Rechercher
        </button>
      </form>

      {/* Filters */}
      {searched && (
        <div className="tabs">
          {['all', 'people', 'posts'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`tab ${filter === f ? 'active' : ''}`}>
              {f === 'all' ? 'Tout' : f === 'people' ? 'Personnes' : 'Publications'}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="spinner" />
        </div>
      ) : !searched ? (
        <div className="card empty-state">
          <span className="icon">🔍</span>
          <h3>Lancez une recherche</h3>
          <p>Trouvez des personnes ou des publications</p>
        </div>
      ) : !hasResults ? (
        <div className="card empty-state">
          <span className="icon">😶</span>
          <h3>Aucun résultat pour « {q} »</h3>
          <p>Essayez un autre terme</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* People */}
          {(filter === 'all' || filter === 'people') && people.length > 0 && (
            <section>
              {filter === 'all' && (
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px', paddingLeft: '2px' }}>
                  Personnes
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {people.map(person => {
                  const rel = relations[person.id] ?? person.relation;
                  const btn = btnConfig[rel] || btnConfig.none;
                  return (
                    <div key={person.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px' }}>
                      <Link to={`/profile/${person.id}`}>
                        <img src={person.avatar || 'https://i.pravatar.cc/46'}
                          className="avatar" style={{ width: 44, height: 44 }} />
                      </Link>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link to={`/profile/${person.id}`} style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                          {person.name}
                        </Link>
                        {person.bio && (
                          <div style={{ fontSize: '12.5px', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {person.bio}
                          </div>
                        )}
                      </div>
                      {person.id !== me?.id && (
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          {rel === 'friends' && (
                            <button onClick={() => handleMessage(person.id)} className="btn btn-ghost" style={{ fontSize: '12px', padding: '6px 10px' }}>💬</button>
                          )}
                          <button onClick={() => handleFriendAction(person)} className={`btn ${btn.cls}`} style={{ fontSize: '12px', padding: '6px 12px' }}>
                            {btn.label}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Posts */}
          {(filter === 'all' || filter === 'posts') && posts.length > 0 && (
            <section>
              {filter === 'all' && (
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px', paddingLeft: '2px' }}>
                  Publications
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {posts.map(post => (
                  <div key={post.id} className="card" style={{ padding: '14px 16px' }}>
                    <Link to={`/profile/${post.author_id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <img src={post.author_avatar || 'https://i.pravatar.cc/34'}
                        className="avatar" style={{ width: 32, height: 32 }} />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)' }}>{post.author_name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
                          {new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </Link>
                    <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                      <Highlighted text={post.content} highlight={q} />
                    </p>
                    {post.images?.filter(Boolean).length > 0 && (
                      <div style={{ marginTop: '10px', borderRadius: '10px', overflow: 'hidden' }}>
                        <img src={post.images.filter(Boolean)[0]} style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '14px', marginTop: '10px', fontSize: '12.5px', color: 'var(--text-3)' }}>
                      <span>👍 {post.likes_count || 0}</span>
                      <span>💬 {post.comments_count || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Highlighted({ text, highlight }) {
  if (!highlight || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase()
          ? <mark key={i} style={{ background: 'rgba(79,142,247,.25)', color: 'var(--accent)', borderRadius: '3px', padding: '0 2px' }}>{part}</mark>
          : part
      )}
    </>
  );
}