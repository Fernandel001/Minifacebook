import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUser } from '../api/users';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setSuccess(false);
    setError('');

    try {
      const res = await updateUser(user.id, { name: name.trim(), bio: bio.trim() });
      // Met à jour le contexte auth avec les nouvelles infos
      const updatedUser = { ...user, name: res.data.name, bio: res.data.bio, avatar: res.data.avatar };
      login(updatedUser, localStorage.getItem('token'));
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError('Une erreur est survenue. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">

      {/* Profil */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Mon profil</h2>

        {/* Avatar (lecture seule — géré via Google) */}
        <div className="flex items-center gap-4 mb-5">
          <img
            src={user?.avatar || 'https://i.pravatar.cc/64'}
            className="w-16 h-16 rounded-full object-cover"
          />
          <div>
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-gray-400">Photo gérée par votre compte Google</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom affiché</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={60}
              placeholder="Votre nom"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="Parlez un peu de vous..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">{bio.length}/200</p>
          </div>

          {success && (
            <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">✅ Profil mis à jour !</p>
          )}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-40 transition"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </form>
      </div>

      {/* Mon profil public */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Mon profil public</h2>
        <p className="text-sm text-gray-500 mb-3">Voir comment les autres vous voient</p>
        <button
          onClick={() => navigate(`/profile/${user?.id}`)}
          className="text-sm text-blue-500 hover:underline"
        >
          → Voir mon profil
        </button>
      </div>

      {/* Déconnexion */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-1">Session</h2>
        <p className="text-sm text-gray-500 mb-4">Connecté en tant que <strong>{user?.name}</strong></p>
        <button
          onClick={handleLogout}
          className="w-full border border-red-200 text-red-500 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}