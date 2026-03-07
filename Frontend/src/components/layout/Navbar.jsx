import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchVal.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/',         icon: '⊞',  label: 'Fil' },
    { path: '/friends',  icon: '👥', label: 'Amis' },
    { path: '/messages', icon: '💬', label: 'Messages' },
    { path: '/search',   icon: '🔍', label: 'Chercher' },
  ];

  return (
    <>
      {/* ─── TOP BAR ─────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(15,17,23,.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        height: '64px',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: '12px',
      }}>
        {/* Logo */}
        <Link to="/" style={{
          fontFamily: 'var(--font-head)',
          fontSize: '18px',
          fontWeight: 800,
          color: 'var(--accent)',
          letterSpacing: '-0.5px',
          flexShrink: 0,
        }}>
          mini<span style={{ color: 'var(--text)' }}>fb</span>
        </Link>

        {/* Search — masquée sur mobile */}
        <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: '340px', display: 'flex' }}>
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Rechercher..."
            className="input input-pill"
            style={{ fontSize: '13.5px', padding: '7px 16px' }}
          />
        </form>

        {/* Nav links — desktop only */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}
             className="desktop-nav">
          {navLinks.map(l => (
            <Link key={l.path} to={l.path} style={{
              padding: '7px 13px',
              borderRadius: '99px',
              fontSize: '13.5px',
              fontWeight: 500,
              color: isActive(l.path) ? 'var(--accent)' : 'var(--text-2)',
              background: isActive(l.path) ? 'var(--accent-dim)' : 'transparent',
              transition: 'all .15s',
            }}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Avatar menu */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{
              background: 'none', border: '2px solid var(--border)',
              borderRadius: '50%', padding: 0, cursor: 'pointer',
              transition: 'border-color .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <img src={user?.avatar || 'https://i.pravatar.cc/36'}
              className="avatar" style={{ width: 34, height: 34 }} />
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow)',
              minWidth: '180px',
              overflow: 'hidden',
              zIndex: 200,
            }} onClick={() => setMenuOpen(false)}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{user?.name}</div>
              </div>
              <MenuLink to={`/profile/${user?.id}`}>👤 Mon profil</MenuLink>
              <MenuLink to="/settings">⚙️ Paramètres</MenuLink>
              <button onClick={handleLogout} style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 16px', fontSize: '13.5px', fontWeight: 500,
                background: 'none', border: 'none', color: 'var(--red)',
                cursor: 'pointer', transition: 'background .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,101,101,.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                ↩ Déconnexion
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ─── BOTTOM NAV (mobile only) ─────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(15,17,23,.95)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        height: '60px',
      }} className="mobile-nav">
        {navLinks.map(l => (
          <Link key={l.path} to={l.path} style={{
            flex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '2px',
            fontSize: '18px',
            color: isActive(l.path) ? 'var(--accent)' : 'var(--text-3)',
            transition: 'color .15s',
            textDecoration: 'none',
          }}>
            <span>{l.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: 500 }}>{l.label}</span>
          </Link>
        ))}
        <Link to={`/profile/${user?.id}`} style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '2px',
          color: isActive(`/profile/${user?.id}`) ? 'var(--accent)' : 'var(--text-3)',
        }}>
          <img src={user?.avatar || 'https://i.pravatar.cc/24'}
            className="avatar" style={{ width: 24, height: 24, border: isActive(`/profile/${user?.id}`) ? '2px solid var(--accent)' : '2px solid transparent' }} />
          <span style={{ fontSize: '10px', fontWeight: 500 }}>Moi</span>
        </Link>
      </nav>

      {/* CSS responsive */}
      <style>{`
        .desktop-nav { display: none; }
        .mobile-nav  { display: flex !important; }
        @media (min-width: 640px) {
          .desktop-nav { display: flex !important; }
          .mobile-nav  { display: none !important; }
        }
      `}</style>
    </>
  );
}

function MenuLink({ to, children }) {
  return (
    <Link to={to} style={{
      display: 'block', padding: '10px 16px',
      fontSize: '13.5px', fontWeight: 500, color: 'var(--text-2)',
      transition: 'background .12s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
    onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      {children}
    </Link>
  );
}