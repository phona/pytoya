import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_BASE_URL } from '@/api/client';
import { useAuthStore } from '@/shared/stores/auth';
import { useExtractionStore } from '@/shared/stores/extraction';
import { useJobsStore } from '@/shared/stores/jobs';

interface JobUpdateEvent {
  jobId?: string;
  manifestId: number;
  kind?: 'extraction' | 'ocr';
  progress: number;
  status: string;
  error?: string;
  cost?: number | null;
  currency?: string | null;
  costBreakdown?: {
    text?: number;
    llm?: number;
    total?: number | null;
    currency?: string | null;
  };
  extractorId?: string | null;
  textMarkdownSoFar?: string;
  textPagesProcessed?: number;
  textPagesTotal?: number;
}

interface ManifestUpdateEvent {
  manifestId: number;
  status: string;
  progress: number;
  error?: string;
  cost?: number | null;
  currency?: string | null;
  costBreakdown?: {
    text?: number;
    llm?: number;
    total?: number | null;
    currency?: string | null;
  };
  extractorId?: string | null;
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

type ConnectionState = {
  isConnected: boolean;
  isConnecting: boolean;
};

let socketSingleton: Socket | null = null;
let connectionState: ConnectionState = { isConnected: false, isConnecting: false };
let activeHookCount = 0;

const connectionListeners = new Set<(state: ConnectionState) => void>();
const jobUpdateListeners = new Set<(data: JobUpdateEvent) => void>();
const manifestUpdateListeners = new Set<(data: ManifestUpdateEvent) => void>();
const ocrUpdateListeners = new Set<(data: OcrUpdateEvent) => void>();
const connectListeners = new Set<() => void>();
const disconnectListeners = new Set<() => void>();
const errorListeners = new Set<(error: Error) => void>();

// Ref-counted manifest subscriptions across all hook users.
const manifestSubscriptionCounts = new Map<number, number>();
const subscribedManifests = new Set<number>();

// Costs are emitted on completion via both job + manifest updates.
// Only count completed jobs once to avoid double counting across components.
const processedCostJobs = new Set<string>();

const notifyConnection = () => {
  for (const listener of connectionListeners) {
    listener(connectionState);
  }
};

const setConnectionState = (next: Partial<ConnectionState>) => {
  connectionState = { ...connectionState, ...next };
  notifyConnection();
};

const getAuthToken = () => useAuthStore.getState().token;

const subscribeManifestInternal = (manifestId: number) => {
  const socket = socketSingleton;
  if (!socket || !socket.connected) {
    return;
  }
  if (subscribedManifests.has(manifestId)) {
    return;
  }

  socket.emit('subscribe-manifest', { manifestId }, (response: SubscriptionResponse) => {
    if (response.event === 'subscribed') {
      subscribedManifests.add(manifestId);
    }
  });
};

const unsubscribeManifestInternal = (manifestId: number) => {
  const socket = socketSingleton;
  if (!socket || !socket.connected) {
    subscribedManifests.delete(manifestId);
    return;
  }
  if (!subscribedManifests.has(manifestId)) {
    return;
  }

  socket.emit('unsubscribe-manifest', { manifestId }, (response: SubscriptionResponse) => {
    if (response.event === 'unsubscribed') {
      subscribedManifests.delete(manifestId);
    }
  });
};

const connectSocketIfNeeded = () => {
  if (socketSingleton || connectionState.isConnecting) {
    return;
  }

  const token = getAuthToken();
  if (!token) {
    return;
  }

  setConnectionState({ isConnecting: true });

  try {
    const socket = io(`${WS_BASE_URL}/manifests`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      setConnectionState({ isConnected: true, isConnecting: false });

      for (const manifestId of manifestSubscriptionCounts.keys()) {
        subscribeManifestInternal(manifestId);
      }

      for (const listener of connectListeners) {
        listener();
      }
    });

    socket.on('disconnect', () => {
      setConnectionState({ isConnected: false });
      subscribedManifests.clear();
      for (const listener of disconnectListeners) {
        listener();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setConnectionState({ isConnecting: false });
      for (const listener of errorListeners) {
        listener(error);
      }
    });

    socket.on('job-update', (data: JobUpdateEvent) => {
      if (data.status === 'completed') {
        const jobId = data.jobId;
        if (jobId && processedCostJobs.has(jobId)) {
          useJobsStore.getState().upsertFromJobUpdate(data);
          for (const listener of jobUpdateListeners) {
            listener(data);
          }
          return;
        }

        if (jobId) {
          processedCostJobs.add(jobId);
        }

        if (data.costBreakdown) {
          const addCost = useExtractionStore.getState().addCost;
          if (data.costBreakdown.text !== undefined) {
            addCost(data.costBreakdown.text, 'text');
          }
          if (data.costBreakdown.llm !== undefined) {
            addCost(data.costBreakdown.llm, 'llm');
          }
          if (
            typeof data.costBreakdown.total === 'number' &&
            data.costBreakdown.text === undefined &&
            data.costBreakdown.llm === undefined
          ) {
            addCost(data.costBreakdown.total, 'total');
          }
        } else if (typeof data.cost === 'number') {
          useExtractionStore.getState().addCost(data.cost, 'total');
        }
      }

      useJobsStore.getState().upsertFromJobUpdate(data);
      for (const listener of jobUpdateListeners) {
        listener(data);
      }
    });

    socket.on('manifest-update', (data: ManifestUpdateEvent) => {
      for (const listener of manifestUpdateListeners) {
        listener(data);
      }
    });

    socket.on('ocr-update', (data: OcrUpdateEvent) => {
      for (const listener of ocrUpdateListeners) {
        listener(data);
      }
    });

    socketSingleton = socket;
  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
    setConnectionState({ isConnecting: false });
    for (const listener of errorListeners) {
      listener(error as Error);
    }
  }
};

const disconnectSocket = () => {
  if (socketSingleton) {
    socketSingleton.disconnect();
    socketSingleton = null;
  }
  subscribedManifests.clear();
  setConnectionState({ isConnected: false, isConnecting: false });
};

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(connectionState.isConnected);
  const [isConnecting, setIsConnecting] = useState(connectionState.isConnecting);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    activeHookCount += 1;
    connectSocketIfNeeded();

    const handleConnection = (state: ConnectionState) => {
      setIsConnected(state.isConnected);
      setIsConnecting(state.isConnecting);
    };

    const handleJobUpdate = (data: JobUpdateEvent) => optionsRef.current.onJobUpdate?.(data);
    const handleManifestUpdate = (data: ManifestUpdateEvent) => optionsRef.current.onManifestUpdate?.(data);
    const handleOcrUpdate = (data: OcrUpdateEvent) => optionsRef.current.onOcrUpdate?.(data);
    const handleConnect = () => optionsRef.current.onConnect?.();
    const handleDisconnect = () => optionsRef.current.onDisconnect?.();
    const handleError = (error: Error) => optionsRef.current.onError?.(error);

    connectionListeners.add(handleConnection);
    jobUpdateListeners.add(handleJobUpdate);
    manifestUpdateListeners.add(handleManifestUpdate);
    ocrUpdateListeners.add(handleOcrUpdate);
    connectListeners.add(handleConnect);
    disconnectListeners.add(handleDisconnect);
    errorListeners.add(handleError);

    // Immediately sync local state to current connection state.
    handleConnection(connectionState);

    return () => {
      activeHookCount -= 1;
      connectionListeners.delete(handleConnection);
      jobUpdateListeners.delete(handleJobUpdate);
      manifestUpdateListeners.delete(handleManifestUpdate);
      ocrUpdateListeners.delete(handleOcrUpdate);
      connectListeners.delete(handleConnect);
      disconnectListeners.delete(handleDisconnect);
      errorListeners.delete(handleError);

      if (activeHookCount <= 0) {
        disconnectSocket();
      }
    };
  }, []);

  const subscribeToManifest = useCallback((manifestId: number) => {
    const count = manifestSubscriptionCounts.get(manifestId) ?? 0;
    manifestSubscriptionCounts.set(manifestId, count + 1);
    if (count === 0) {
      subscribeManifestInternal(manifestId);
    }
  }, []);

  const unsubscribeFromManifest = useCallback((manifestId: number) => {
    const count = manifestSubscriptionCounts.get(manifestId) ?? 0;
    if (count <= 1) {
      manifestSubscriptionCounts.delete(manifestId);
      unsubscribeManifestInternal(manifestId);
      return;
    }
    manifestSubscriptionCounts.set(manifestId, count - 1);
  }, []);

  const disconnect = useCallback(() => {
    disconnectSocket();
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
