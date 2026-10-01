import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

const GlobalContext = createContext();

const getSocketUrl = () => {
  const wsEnv = import.meta.env.VITE_WS_URL;
  if (wsEnv && wsEnv.startsWith('http')) {
    return wsEnv;
  }
  const apiEnv = import.meta.env.VITE_API_URL;
  if (apiEnv && apiEnv.startsWith('http')) {
    return apiEnv.replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined' && window.location) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return 'https://api-capstone.sangkolo.my.id';
  }
  return 'http://localhost:5000';
};

const SOCKET_URL = getSocketUrl();

export const GlobalProvider = ({ children }) => {
  // --- Auth State ---
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }, []);

  // --- WebSocket State ---
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeData, setRealtimeData] = useState(null);

  useEffect(() => {
    // Connect when user is authenticated or on public dashboard
    const newSocket = io(SOCKET_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      autoConnect: true,
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {}
    });

    newSocket.on('connect', () => {
      console.log('Terhubung ke WebSocket Server:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.warn('Terputus dari WebSocket Server:', reason);
      setIsConnected(false);
    });

    newSocket.on('new_sensor_data', (data) => {
      setRealtimeData(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('new_sensor_data');
      newSocket.disconnect();
    };
  }, [token]);

  const value = {
    user,
    token,
    login,
    logout,
    socket,
    isConnected,
    realtimeData
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }
  return context;
};
