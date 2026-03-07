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
    setSaving(true); setSuccess(false); setError('');
    try {
      const res = await updateUser(user.id, { name: name.trim(), bio: bio.trim() });
      const updatedUser = { ...user, name: res.data.name, bio: res.data.bio, avatar: res.data.avatar };
      login(updatedUser, localStorage.getItem('token'));
      setSuccess(true);
    } catch (err) {
      setError('Une erreur est survenue. Réessayez.');
    } finally { setSaving(false); }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '520px', margin: '0 auto' }}>

      <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '22px', fontWeight: 700 }}>Paramètres</h1>

      {/* Profile card */}
      <div className="card" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '16px' }}>
          Mon profil
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', padding: '12px', background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <img src={user?.avatar || 'https://i.pravatar.cc/56'}
            className="avatar" style={{ width: 52, height: 52 }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{user?.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>
              Photo gérée par votre compte Google
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>
              Nom affiché
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={60}
              placeholder="Votre nom"
              className="input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>
              Bio
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="Parlez un peu de vous..."
              className="input"
            />
            <div style={{ textAlign: 'right', fontSize: '11.5px', color: 'var(--text-3)', marginTop: '4px' }}>
              {bio.length}/200
            </div>
          </div>

          {success && (
            <div style={{ background: 'rgba(62,207,142,.1)', border: '1px solid rgba(62,207,142,.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '13.5px', color: 'var(--green)' }}>
              ✅ Profil mis à jour avec succès !
            </div>
          )}
          {error && (
            <div style={{ background: 'rgba(245,101,101,.1)', border: '1px solid rgba(245,101,101,.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '13.5px', color: 'var(--red)' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={saving || !name.trim()} className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
            {saving ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Enregistrement...
              </span>
            ) : 'Enregistrer'}
          </button>
        </form>
      </div>

      {/* View profile */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Mon profil public</div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-3)', marginTop: '2px' }}>Voir comme les autres vous voient</div>
        </div>
        <button onClick={() => navigate(`/profile/${user?.id}`)} className="btn btn-ghost" style={{ fontSize: '13px' }}>
          Voir →
        </button>
      </div>

      {/* Session */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Session</div>
        <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '14px' }}>
          Connecté en tant que <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{user?.name}</span>
        </div>
        <button onClick={handleLogout} className="btn btn-danger" style={{
          border: '1px solid rgba(245,101,101,.3)',
          background: 'rgba(245,101,101,.07)',
          borderRadius: 'var(--radius-sm)',
          padding: '9px 16px',
          fontSize: '13.5px',
          width: '100%',
          justifyContent: 'center',
        }}>
          ↩ Se déconnecter
        </button>
      </div>
    </div>
  );
}