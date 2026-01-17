import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/shared/stores/auth';
import { WS_BASE_URL } from '@/api/client';

interface JobUpdateEvent {
  manifestId: number;
  progress: number;
  status: string;
  error?: string;
}

interface ManifestUpdateEvent {
  manifestId: number;
  status: string;
  progress: number;
  error?: string;
}

interface UseWebSocketOptions {
  onJobUpdate?: (data: JobUpdateEvent) => void;
  onManifestUpdate?: (data: ManifestUpdateEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface SubscriptionResponse {
  event?: 'subscribed' | 'unsubscribed';
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const subscriptionsRef = useRef<Set<number>>(new Set());

  const {
    onJobUpdate,
    onManifestUpdate,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  // Get auth token from Zustand store (same as HTTP)
  const getAuthToken = useCallback(() => {
    return useAuthStore.getState().token;
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    if (socketRef.current || isConnecting) return;

    setIsConnecting(true);

    try {
      const token = getAuthToken();

      const socket = io(`${WS_BASE_URL}/manifests`, {
        auth: token ? { token } : undefined,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        onConnect?.();
      });

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        onDisconnect?.();
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setIsConnecting(false);
        onError?.(error);
      });

      socket.on('job-update', (data: JobUpdateEvent) => {
        onJobUpdate?.(data);
      });

      socket.on('manifest-update', (data: ManifestUpdateEvent) => {
        onManifestUpdate?.(data);
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnecting(false);
      onError?.(error as Error);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isConnecting, getAuthToken, onConnect, onDisconnect, onError, onJobUpdate, onManifestUpdate]);

  // Subscribe to manifest updates
  const subscribeToManifest = useCallback((manifestId: number) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      console.warn('Cannot subscribe: WebSocket not connected');
      return;
    }

    if (subscriptionsRef.current.has(manifestId)) {
      console.log(`Already subscribed to manifest ${manifestId}`);
      return;
    }

    console.log(`Subscribing to manifest ${manifestId}`);
    socket.emit('subscribe-manifest', { manifestId }, (response: SubscriptionResponse) => {
      if (response.event === 'subscribed') {
        subscriptionsRef.current.add(manifestId);
      }
    });
  }, []);

  // Unsubscribe from manifest updates
  const unsubscribeFromManifest = useCallback((manifestId: number) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      console.warn('Cannot unsubscribe: WebSocket not connected');
      return;
    }

    if (!subscriptionsRef.current.has(manifestId)) {
      console.log(`Not subscribed to manifest ${manifestId}`);
      return;
    }

    console.log(`Unsubscribing from manifest ${manifestId}`);
    socket.emit('unsubscribe-manifest', { manifestId }, (response: SubscriptionResponse) => {
      if (response.event === 'unsubscribed') {
        subscriptionsRef.current.delete(manifestId);
      }
    });
  }, []);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  return {
    isConnected,
    isConnecting,
    subscribeToManifest,
    unsubscribeFromManifest,
    disconnect,
  };
}

export type { JobUpdateEvent, ManifestUpdateEvent };
