import { useGlobalContext } from '../context/useGlobalContext';

const useWebSocket = () => {
  const { realtimeData, isConnected, socket } = useGlobalContext();
  
  return { realtimeData, isConnected, socket };
};

export default useWebSocket;
