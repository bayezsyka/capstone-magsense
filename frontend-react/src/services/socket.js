import { io } from 'socket.io-client';

const getWsUrl = () => {
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

export const socket = io(getWsUrl(), {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000
});

export default socket;
