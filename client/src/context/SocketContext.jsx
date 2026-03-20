import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const SOCKET_URL = 'http://localhost:5000';

export function SocketProvider({ children }) {
  const [socket, setSocket]             = useState(null);
  const [connected, setConnected]       = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [latestSensor, setLatestSensor] = useState(null);

  useEffect(() => {
    const s = io(SOCKET_URL, {
      // Don't throw on connection failure — retry silently
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      timeout: 5000,
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setConnected(true);
      console.log('[Socket] Connected to server');
    });

    s.on('disconnect', (reason) => {
      setConnected(false);
      console.warn('[Socket] Disconnected:', reason);
    });

    s.on('connect_error', (err) => {
      setConnected(false);
      // Suppress noisy console spam — only log once per error type
      console.warn('[Socket] Connection error (will retry):', err.message);
    });

    s.on('sensorUpdate', (data) => setLatestSensor(data));

    s.on('notification', (data) => {
      setNotifications(prev => [{ ...data, id: Date.now() }, ...prev].slice(0, 20));
    });

    s.on('claimTriggered', (data) => {
      setNotifications(prev => [{
        id: Date.now(),
        message: `🚨 Claim auto-filed: ${data.claim?.claimType?.replace(/_/g, ' ')} — Risk: ${data.riskLevel}`,
        type: data.riskLevel,
      }, ...prev].slice(0, 20));
    });

    setSocket(s);
    return () => s.disconnect();
  }, []);

  const clearNotification = (id) =>
    setNotifications(prev => prev.filter(n => n.id !== id));

  return (
    <SocketContext.Provider value={{ socket, connected, notifications, latestSensor, clearNotification }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
