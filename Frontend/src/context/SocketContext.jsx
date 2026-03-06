import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    const newSocket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connecté');
    });

    newSocket.on('user_online', ({ userId }) => {
      setOnlineUsers(prev => [...new Set([...prev, userId])]);
    });

    newSocket.on('user_offline', ({ userId }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);