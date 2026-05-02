import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [vehicles, setVehicles] = useState({});
  const [events, setEvents] = useState([]);

  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000', {
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('Connected to Telemetry Socket');
      setIsConnected(true);
      socketInstance.emit('subscribe:fleet');
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from Telemetry Socket');
      setIsConnected(false);
    });

    socketInstance.on('telemetry:update', (data) => {
      setVehicles((prev) => ({
        ...prev,
        [data.deviceId]: {
          ...data,
          lastUpdate: Date.now()
        }
      }));
    });

    socketInstance.on('geofence:event', (data) => {
      const eventWithId = { ...data, id: `${data.deviceId}-${Date.now()}-${Math.random()}` };
      setEvents((prev) => [eventWithId, ...prev].slice(0, 50));
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, vehicles, events, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
