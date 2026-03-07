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
  const inputRef = useRef(null);

  const q = searchParams.get('q') || '';
  const [filter, setFilter] = useState('all'); // 'all' | 'people' | 'posts'
  const [results, setResults] = useState({ people: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [localInput, setLocalInput] = useState(q);

  // Relations locales pour mise à jour optimiste
  const [relations, setRelations] = useState({});

  useEffect(() => {
    setLocalInput(q);
    if (q) {
      doSearch(q, filter);
    }
  }, [q]);

  useEffect(() => {
    if (q) doSearch(q, filter);
  }, [filter]);

  const doSearch = async (query, f) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await search(query, f === 'all' ? undefined : f);
      setResults(res.data.results);
      // Init les relations depuis les résultats
      const rel = {};
      res.data.results.people?.forEach(p => { rel[p.id] = p.relation; });
      setRelations(rel);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!localInput.trim()) return;
    navigate(`/search?q=${encodeURIComponent(localInput.trim())}`);
  };

  const handleFriendAction = async (person) => {
    const rel = relations[person.id] || person.relation;
    try {
      if (rel === 'none') {
        await sendFriendRequest(person.id);
        setRelations(prev => ({ ...prev, [person.id]: 'pending_sent' }));
      } else if (rel === 'pending_received') {
        await acceptFriendRequest(person.id);
        setRelations(prev => ({ ...prev, [person.id]: 'friends' }));
      } else if (rel === 'friends' || rel === 'pending_sent') {
        await removeFriend(person.id);
        setRelations(prev => ({ ...prev, [person.id]: 'none' }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMessage = async (userId) => {
    try {
      await startConversation(userId);
      navigate(`/messages?with=${userId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const friendBtnConfig = {
    none:             { label: '+ Ajouter', style: 'bg-blue-500 text-white hover:bg-blue-600' },
    pending_sent:     { label: 'Demande envoyée', style: 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-400' },
    pending_received: { label: 'Accepter', style: 'bg-green-500 text-white hover:bg-green-600' },
    friends:          { label: '✓ Amis', style: 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-400' },
  };

  const tabs = [
    { key: 'all', label: 'Tout' },
    { key: 'people', label: 'Personnes' },
    { key: 'posts', label: 'Publications' },
  ];

  const people = results.people || [];
  const posts = results.posts || [];
  const hasResults = people.length > 0 || posts.length > 0;

  return (
    <div className="space-y-4">

      {/* Barre de recherche */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-4 flex gap-2">
        <input
          ref={inputRef}
          value={localInput}
          onChange={e => setLocalInput(e.target.value)}
          placeholder="Rechercher des personnes ou des publications..."
          autoFocus
          className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          disabled={!localInput.trim()}
          className="bg-blue-500 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-blue-600 disabled:opacity-40 transition"
        >
          Rechercher
        </button>
      </form>

      {/* Filtres */}
      {searched && (
        <div className="bg-white rounded-xl shadow-sm p-1 flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                filter === tab.key
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Résultats */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !searched ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-gray-500 text-sm">Entrez un nom ou un mot-clé pour chercher</p>
        </div>
      ) : !hasResults ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-3xl mb-3">😶</p>
          <p className="font-medium text-gray-700">Aucun résultat pour « {q} »</p>
          <p className="text-sm text-gray-400 mt-1">Essayez un autre terme</p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* Personnes */}
          {(filter === 'all' || filter === 'people') && people.length > 0 && (
            <section className="space-y-2">
              {filter === 'all' && (
                <h2 className="text-sm font-semibold text-gray-500 px-1">Personnes</h2>
              )}
              {people.map(person => {
                const rel = relations[person.id] ?? person.relation;
                const btn = friendBtnConfig[rel] || friendBtnConfig.none;
                return (
                  <div key={person.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                    <Link to={`/profile/${person.id}`} className="shrink-0">
                      <img
                        src={person.avatar || 'https://i.pravatar.cc/48'}
                        className="w-12 h-12 rounded-full object-cover hover:opacity-90 transition"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/profile/${person.id}`} className="text-sm font-medium hover:underline block truncate">
                        {person.name}
                      </Link>
                      {person.bio && (
                        <p className="text-xs text-gray-400 truncate">{person.bio}</p>
                      )}
                    </div>
                    {person.id !== me?.id && (
                      <div className="flex gap-2 shrink-0">
                        {rel === 'friends' && (
                          <button
                            onClick={() => handleMessage(person.id)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                          >
                            💬
                          </button>
                        )}
                        <button
                          onClick={() => handleFriendAction(person)}
                          className={`text-xs px-3 py-1.5 rounded-lg transition font-medium ${btn.style}`}
                        >
                          {btn.label}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {/* Publications */}
          {(filter === 'all' || filter === 'posts') && posts.length > 0 && (
            <section className="space-y-2">
              {filter === 'all' && (
                <h2 className="text-sm font-semibold text-gray-500 px-1">Publications</h2>
              )}
              {posts.map(post => (
                <div key={post.id} className="bg-white rounded-xl shadow-sm p-4 space-y-2">
                  <Link to={`/profile/${post.author_id}`} className="flex items-center gap-2">
                    <img
                      src={post.author_avatar || 'https://i.pravatar.cc/36'}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-medium">{post.author_name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(post.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                  </Link>
                  <p className="text-sm text-gray-800">
                    <Highlighted text={post.content} highlight={q} />
                  </p>
                  {post.images?.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
                      {post.images.filter(Boolean).map((url, i) => (
                        <img key={i} src={url} className="w-full object-cover max-h-48" />
                      ))}
                    </div>
                  )}
                  <div className="flex gap-4 text-xs text-gray-400 pt-1 border-t border-gray-100">
                    <span>👍 {post.likes_count || 0}</span>
                    <span>💬 {post.comments_count || 0}</span>
                  </div>
                </div>
              ))}
            </section>
          )}

        </div>
      )}
    </div>
  );
}

// Surligne le mot cherché dans le texte
function Highlighted({ text, highlight }) {
  if (!highlight || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase()
          ? <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">{part}</mark>
          : part
      )}
    </>
  );
}