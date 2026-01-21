import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/shared/stores/auth';
import { useExtractionStore } from '@/shared/stores/extraction';
import { WS_BASE_URL } from '@/api/client';

interface JobUpdateEvent {
  jobId?: string;
  manifestId: number;
  progress: number;
  status: string;
  error?: string;
  cost?: number;
  costBreakdown?: {
    text?: number;
    llm?: number;
    total?: number;
  };
}

interface ManifestUpdateEvent {
  manifestId: number;
  status: string;
  progress: number;
  error?: string;
  cost?: number;
  costBreakdown?: {
    text?: number;
    llm?: number;
    total?: number;
  };
}

interface OcrUpdateEvent {
  manifestId: number;
  hasOcr: boolean;
  qualityScore?: number | null;
  processedAt?: string | null;
}

interface UseWebSocketOptions {
  onJobUpdate?: (data: JobUpdateEvent) => void;
  onManifestUpdate?: (data: ManifestUpdateEvent) => void;
  onOcrUpdate?: (data: OcrUpdateEvent) => void;
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
  const connectingRef = useRef(false);
  const subscriptionsRef = useRef<Set<number>>(new Set());
  const desiredSubscriptionsRef = useRef<Set<number>>(new Set());

  const {
    onJobUpdate,
    onManifestUpdate,
    onOcrUpdate,
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
    if (socketRef.current || connectingRef.current) return;

    connectingRef.current = true;
    setIsConnecting(true);

    try {
      const token = getAuthToken();

      const socket = io(`${WS_BASE_URL}/manifests`, {
        auth: token ? { token } : undefined,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        setIsConnected(true);
        setIsConnecting(false);
        connectingRef.current = false;

        // Resubscribe to any manifests that were requested before connection.
        for (const manifestId of desiredSubscriptionsRef.current) {
          socket.emit('subscribe-manifest', { manifestId }, (response: SubscriptionResponse) => {
            if (response.event === 'subscribed') {
              subscriptionsRef.current.add(manifestId);
            }
          });
        }

        onConnect?.();
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        onDisconnect?.();
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setIsConnecting(false);
        connectingRef.current = false;
        onError?.(error);
      });

      socket.on('job-update', (data: JobUpdateEvent) => {
        // Update extraction store with cost breakdown
        if (data.costBreakdown) {
          const addCost = useExtractionStore.getState().addCost;
          if (data.costBreakdown.text !== undefined) {
            addCost(data.costBreakdown.text, 'text');
          }
          if (data.costBreakdown.llm !== undefined) {
            addCost(data.costBreakdown.llm, 'llm');
          }
        } else if (data.cost !== undefined) {
          useExtractionStore.getState().addCost(data.cost, 'total');
        }
        onJobUpdate?.(data);
      });

      socket.on('manifest-update', (data: ManifestUpdateEvent) => {
        // Update extraction store with cost breakdown
        if (data.costBreakdown) {
          const addCost = useExtractionStore.getState().addCost;
          if (data.costBreakdown.text !== undefined) {
            addCost(data.costBreakdown.text, 'text');
          }
          if (data.costBreakdown.llm !== undefined) {
            addCost(data.costBreakdown.llm, 'llm');
          }
        } else if (data.cost !== undefined) {
          useExtractionStore.getState().addCost(data.cost, 'total');
        }
        onManifestUpdate?.(data);
      });

      socket.on('ocr-update', (data: OcrUpdateEvent) => {
        onOcrUpdate?.(data);
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnecting(false);
      connectingRef.current = false;
      onError?.(error as Error);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      connectingRef.current = false;
    };
  }, [
    getAuthToken,
    onConnect,
    onDisconnect,
    onError,
    onJobUpdate,
    onManifestUpdate,
    onOcrUpdate,
  ]);
  

  // Subscribe to manifest updates
  const subscribeToManifest = useCallback((manifestId: number) => {
    desiredSubscriptionsRef.current.add(manifestId);
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      return;
    }

    if (subscriptionsRef.current.has(manifestId)) {
      return;
    }

    socket.emit('subscribe-manifest', { manifestId }, (response: SubscriptionResponse) => {
      if (response.event === 'subscribed') {
        subscriptionsRef.current.add(manifestId);
      }
    });
  }, []);

  // Unsubscribe from manifest updates
  const unsubscribeFromManifest = useCallback((manifestId: number) => {
    desiredSubscriptionsRef.current.delete(manifestId);
    const socket = socketRef.current;
    if (!socket || !socket.connected) {
      return;
    }

    if (!subscriptionsRef.current.has(manifestId)) {
      return;
    }

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

export type { JobUpdateEvent, ManifestUpdateEvent, OcrUpdateEvent };



