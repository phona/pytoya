// test/setup.ts
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup } from '@testing-library/react';
import { TextEncoder, TextDecoder } from 'util';
import { vi } from 'vitest';

// Polyfill for TextEncoder/TextDecoder in jsdom
global.TextEncoder = TextEncoder as typeof global.TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Radix UI relies on ResizeObserver + pointer capture APIs in jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!global.ResizeObserver) {
  global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}

if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Blob URL helpers are not always present in jsdom
if (typeof window !== 'undefined' && window.URL) {
  if (!('createObjectURL' in window.URL)) {
    (window.URL as any).createObjectURL = () => 'blob:mock';
  }
  if (!('revokeObjectURL' in window.URL)) {
    (window.URL as any).revokeObjectURL = () => {};
  }
}

// Suppress expected console errors in tests (unless debugging)
const originalError = console.error;
const originalWarn = console.warn;
const suppressedConsoleMessages = [
  'Warning: ReactDOM.render',
  'Error: Boom',
  'Error: Route crash',
  'Web app error boundary caught an error',
  'The above error occurred in the <Bomb> component',
  'The above error occurred in the <BombRoute> component',
  'React will try to recreate this component tree from scratch',
  'Warning: An update to ForwardRef inside a test was not wrapped in act',
  'Warning: An update to Tabs inside a test was not wrapped in act',
  'Warning: An update to %s inside a test was not wrapped in act',
];

const isSuppressedConsoleArg = (arg: unknown) => {
  if (typeof arg === 'string') {
    return suppressedConsoleMessages.some((message) => arg.includes(message));
  }
  if (arg instanceof Error) {
    return suppressedConsoleMessages.some((message) => arg.message.includes(message));
  }
  return false;
};

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (args.some(isSuppressedConsoleArg)) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: unknown[]) => {
    if (args.some(isSuppressedConsoleArg)) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterEach(() => {
  cleanup();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock environment variables
import.meta.env.VITE_API_URL = 'http://localhost:3000/api';

vi.mock('@/shared/components/ui/tooltip', () => {
  const passthrough = ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);

  return {
    TooltipProvider: passthrough,
    Tooltip: passthrough,
    TooltipTrigger: passthrough,
    TooltipContent: ({ children }: { children: React.ReactNode }) =>
      React.createElement('span', null, children),
  };
});

vi.mock('@/shared/components/ui/dropdown-menu', () => {
  const passthrough = ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);

  const withProps = ({
    children,
    asChild: _asChild,
    ...props
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => {
    if (React.isValidElement(children)) {
      return React.cloneElement(children, { ...props, ...children.props });
    }
    return React.createElement('span', props, children);
  };

  const simple = ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement('div', props, children);

  const menu = ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement('div', { role: 'menu', ...props }, children);

  const createMenuItem =
    (role: 'menuitem' | 'menuitemcheckbox' | 'menuitemradio') =>
    ({
      children,
      disabled,
      onClick,
      ...props
    }: {
      children: React.ReactNode;
      disabled?: boolean;
      onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
    }) =>
      React.createElement(
        'div',
        {
          role,
          tabIndex: disabled ? -1 : 0,
          'aria-disabled': disabled || undefined,
          ...props,
          onClick: (event: React.MouseEvent<HTMLDivElement>) => {
            if (disabled) {
              event.preventDefault();
              return;
            }
            onClick?.(event);
          },
        },
        children,
      );

  const menuItem = createMenuItem('menuitem');
  const menuItemCheckbox = createMenuItem('menuitemcheckbox');
  const menuItemRadio = createMenuItem('menuitemradio');

  return {
    DropdownMenu: passthrough,
    DropdownMenuTrigger: withProps,
    DropdownMenuContent: menu,
    DropdownMenuItem: menuItem,
    DropdownMenuCheckboxItem: menuItemCheckbox,
    DropdownMenuRadioItem: menuItemRadio,
    DropdownMenuLabel: simple,
    DropdownMenuSeparator: () => React.createElement('hr'),
    DropdownMenuShortcut: simple,
    DropdownMenuGroup: passthrough,
    DropdownMenuPortal: passthrough,
    DropdownMenuSub: passthrough,
    DropdownMenuSubContent: simple,
    DropdownMenuSubTrigger: simple,
    DropdownMenuRadioGroup: passthrough,
  };
});

vi.mock('socket.io-client', () => {
  type Handler = (...args: unknown[]) => void;
  type MockSocket = {
    connected: boolean;
    on: (event: string, handler: Handler) => MockSocket;
    off: (event: string, handler?: Handler) => MockSocket;
    emit: (event: string, payload?: unknown, ack?: (response: unknown) => void) => void;
    disconnect: () => void;
  };

  const listeners = new Map<string, Set<Handler>>();

  const addListener = (event: string, handler: Handler) => {
    const set = listeners.get(event) ?? new Set<Handler>();
    set.add(handler);
    listeners.set(event, set);
  };

  const removeListener = (event: string, handler?: Handler) => {
    if (!handler) {
      listeners.delete(event);
      return;
    }
    listeners.get(event)?.delete(handler);
  };

  const emitEvent = (event: string, ...args: unknown[]) => {
    for (const handler of listeners.get(event) ?? []) {
      handler(...args);
    }
  };

  const socket = {} as MockSocket;
  socket.connected = true;
  socket.on = vi.fn((event: string, handler: Handler) => {
    addListener(event, handler);
    if (event === 'connect') {
      queueMicrotask(() => {
        socket.connected = true;
        handler();
      });
    }
    return socket;
  });
  socket.off = vi.fn((event: string, handler?: Handler) => {
    removeListener(event, handler);
    return socket;
  });
  socket.emit = vi.fn((event: string, _payload?: unknown, ack?: (response: unknown) => void) => {
    if (typeof ack === 'function') {
      if (event === 'subscribe-manifest') {
        ack({ event: 'subscribed' });
        return;
      }
      if (event === 'unsubscribe-manifest') {
        ack({ event: 'unsubscribed' });
        return;
      }
      ack({ ok: true });
    }
  });
  socket.disconnect = vi.fn(() => {
    socket.connected = false;
    emitEvent('disconnect');
  });

  return {
    io: vi.fn(() => socket),
  };
});




