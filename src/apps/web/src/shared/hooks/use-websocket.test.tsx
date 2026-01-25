import { act, renderHook, waitFor } from '@/tests/utils';
import { useAuthStore } from '@/shared/stores/auth';
import { io } from 'socket.io-client';

import { useWebSocket } from './use-websocket';

describe('useWebSocket', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
    (io as unknown as { mockClear?: () => void }).mockClear?.();
  });

  it('connects when an auth token exists', async () => {
    useAuthStore.getState().setAuth(
      { id: 1, username: 'test-user', role: 'user' },
      'mock-jwt-token',
    );

    const { result } = renderHook(() => useWebSocket());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(io).toHaveBeenCalled();
  });

  it('subscribes and unsubscribes to manifests', async () => {
    useAuthStore.getState().setAuth(
      { id: 1, username: 'test-user', role: 'user' },
      'mock-jwt-token',
    );

    const { result } = renderHook(() => useWebSocket());
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const socket = (io as any).mock.results[0]?.value;
    expect(socket).toBeTruthy();

    act(() => {
      result.current.subscribeToManifest(987654);
    });

    await waitFor(() => {
      expect(socket.emit).toHaveBeenCalledWith(
        'subscribe-manifest',
        { manifestId: 987654 },
        expect.any(Function),
      );
    });

    act(() => {
      result.current.unsubscribeFromManifest(987654);
    });

    await waitFor(() => {
      expect(socket.emit).toHaveBeenCalledWith(
        'unsubscribe-manifest',
        { manifestId: 987654 },
        expect.any(Function),
      );
    });
  });
});
