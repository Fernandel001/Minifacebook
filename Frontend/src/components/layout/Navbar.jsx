import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-4">

      {/* Logo */}
      <Link to="/" className="font-bold text-xl shrink-0">
        MiniFacebook
      </Link>

      {/* Barre de recherche */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = e.target.q.value.trim();
          if (q) navigate(`/search?q=${q}`);
        }}
        className="flex-1 max-w-md"
      >
        <input
          name="q"
          type="text"
          placeholder="Rechercher..."
          className="w-full border border-gray-300 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </form>

      {/* Navigation */}
      <div className="flex items-center gap-4 ml-auto">
        <Link to="/" className="text-sm text-gray-600 hover:text-black">Fil</Link>
        <Link to="/friends" className="text-sm text-gray-600 hover:text-black">Amis</Link>
        <Link to="/messages" className="text-sm text-gray-600 hover:text-black">Messages</Link>

        {/* Avatar + menu */}
        <div className="relative group py-2">
          <img
            src={user?.avatar || 'https://i.pravatar.cc/40'}
            className="w-8 h-8 rounded-full cursor-pointer object-cover"
          />
          <div className="absolute right-0 top-full bg-white border border-gray-200 rounded-lg shadow-lg w-40 hidden group-hover:block">
            <Link
              to={`/profile/${user?.id}`}
              className="block px-4 py-2 text-sm hover:bg-gray-50"
            >
              Mon profil
            </Link>
            <Link
              to="/settings"
              className="block px-4 py-2 text-sm hover:bg-gray-50"
            >
              Paramètres
            </Link>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}