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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-xl shadow-md w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold mb-2">MiniFacebook</h1>
        <p className="text-gray-500 mb-8">Connecte-toi pour continuer</p>
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-3 hover:bg-gray-50 transition"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            className="w-5 h-5"
          />
          <span className="font-medium">Continuer avec Google</span>
        </button>
      </div>
    </div>
  );
}