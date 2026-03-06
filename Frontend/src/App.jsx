import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import Friends from './pages/Friends';
import Messages from './pages/Messages';
import Search from './pages/Search';
import Settings from './pages/Settings';
import Layout from './components/layout/Layout';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/" element={<PrivateRoute><Layout><Feed /></Layout></PrivateRoute>} />
      <Route path="/profile/:id" element={<PrivateRoute><Layout><Profile /></Layout></PrivateRoute>} />
      <Route path="/friends" element={<PrivateRoute><Layout><Friends /></Layout></PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute><Layout><Messages /></Layout></PrivateRoute>} />
      <Route path="/search" element={<PrivateRoute><Layout><Search /></Layout></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
