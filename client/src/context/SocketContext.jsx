import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [latestSensor, setLatestSensor] = useState(null);

  useEffect(() => {
    const s = io('http://localhost:5000');
    setSocket(s);

    s.on('sensorUpdate', (data) => setLatestSensor(data));
    s.on('notification', (data) => {
      setNotifications(prev => [{ ...data, id: Date.now() }, ...prev].slice(0, 20));
    });

    return () => s.disconnect();
  }, []);

  const clearNotification = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  return (
    <SocketContext.Provider value={{ socket, notifications, latestSensor, clearNotification }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
