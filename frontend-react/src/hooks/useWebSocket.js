import { useGlobalContext } from '../context/GlobalContext';

const useWebSocket = () => {
  const { realtimeData, isConnected, socket } = useGlobalContext();
  
  return { realtimeData, isConnected, socket };
};

export default useWebSocket;
