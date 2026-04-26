import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import api, { API_BASE_URL } from '@/services/api';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  pendingRequestCount: number;
  connectionUpdateCount: number;
  unreadNotifCount: number;
  clearPendingRequestCount: () => void;
  clearConnectionUpdateCount: () => void;
  clearUnreadNotifCount: () => void;
  addUnreadNotif: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  pendingRequestCount: 0,
  connectionUpdateCount: 0,
  unreadNotifCount: 0,
  clearPendingRequestCount: () => {},
  clearConnectionUpdateCount: () => {},
  clearUnreadNotifCount: () => {},
  addUnreadNotif: () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [connectionUpdateCount, setConnectionUpdateCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    if (!token || !user) {
      setSocket((prev) => { prev?.disconnect(); return null; });
      setPendingRequestCount(0);
      setConnectionUpdateCount(0);
      setUnreadNotifCount(0);
      return;
    }

    let cancelled = false;
    let newSocket: Socket | null = null;

    (async () => {
      const [notificationsResult, connectionsResult] = await Promise.allSettled([
        api.get('/api/notifications'),
        api.get('/api/connections'),
      ]);

      if (cancelled) return;

      if (notificationsResult.status === 'fulfilled') {
        const notifications = notificationsResult.value.data as any[];
        const unreadNotifications = notifications.filter((n) => !n.isRead).length;
        const unreadConnectionUpdates = notifications.filter((n) => !n.isRead && n.type === 'connection_updated').length;
        setUnreadNotifCount(unreadNotifications);
        setConnectionUpdateCount(unreadConnectionUpdates);
      }

      if (connectionsResult.status === 'fulfilled') {
        const connections = connectionsResult.value.data as any[];
        setPendingRequestCount(connections.filter((c) => c.status === 'PENDING').length);
      }

      if (cancelled) return;

      newSocket = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnectionAttempts: 5,
      });

      newSocket.on('new_connection_request', () => {
        setPendingRequestCount((n) => n + 1);
        setUnreadNotifCount((n) => n + 1);
      });

      newSocket.on('connection_updated', () => {
        setConnectionUpdateCount((n) => n + 1);
        setUnreadNotifCount((n) => n + 1);
      });

      // All other notifications (appointment confirmed, visit started/completed, prescription, etc.)
      newSocket.on('notification', () => {
        setUnreadNotifCount((n) => n + 1);
      });

      setSocket(newSocket);
    })();

    return () => {
      cancelled = true;
      newSocket?.disconnect();
      setSocket(null);
    };
  }, [token, user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        pendingRequestCount,
        connectionUpdateCount,
        unreadNotifCount,
        clearPendingRequestCount: () => setPendingRequestCount(0),
        clearConnectionUpdateCount: () => setConnectionUpdateCount(0),
        clearUnreadNotifCount: () => setUnreadNotifCount(0),
        addUnreadNotif: () => setUnreadNotifCount((n) => n + 1),
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
