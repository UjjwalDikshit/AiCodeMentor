import { useEffect, useState } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

export function useSocket(autoConnect = false) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!autoConnect) return undefined;

    const socket = connectSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      disconnectSocket();
    };
  }, [autoConnect]);

  return { socket: getSocket(), connected };
}
