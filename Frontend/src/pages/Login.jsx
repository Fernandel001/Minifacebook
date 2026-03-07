import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const user = searchParams.get('user');
    if (token && user) {
      login(JSON.parse(decodeURIComponent(user)), token);
      navigate('/');
    }
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        width: '500px', height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,142,247,.12) 0%, transparent 70%)',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />

      <div className="fade-up" style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '380px',
        textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,.6)',
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontFamily: 'var(--font-head)',
            fontSize: '36px',
            fontWeight: 800,
            letterSpacing: '-1px',
            lineHeight: 1,
            marginBottom: '8px',
          }}>
            <span style={{ color: 'var(--accent)' }}>mini</span>
            <span style={{ color: 'var(--text)' }}>fb</span>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: '14px' }}>
            Retrouvez vos amis
          </p>
        </div>

        {/* Divider */}
        <div style={{
          height: '1px',
          background: 'var(--border)',
          margin: '0 -40px 32px',
        }} />

        <p style={{ color: 'var(--text-2)', fontSize: '13.5px', marginBottom: '20px' }}>
          Connectez-vous pour continuer
        </p>

        <button
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            borderRadius: '99px',
            padding: '12px 20px',
            color: 'var(--text)',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer',
            transition: 'all .18s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.background = 'var(--accent-dim)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.background = 'var(--bg3)';
          }}
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" style={{ width: 18, height: 18 }} />
          Continuer avec Google
        </button>

        <p style={{ color: 'var(--text-3)', fontSize: '12px', marginTop: '24px' }}>
          En continuant, vous acceptez nos conditions d'utilisation
        </p>
      </div>
    </div>
  );
}