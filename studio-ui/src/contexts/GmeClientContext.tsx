'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';

import { ensureSocketIoGlobal, GME_CLASSES_SCRIPT } from '@/lib/config';
import { clearStaleStudioSession } from '@/lib/server-session';
import type { GmeClient } from '@/types/gme-global';

type ConnectionState = 'loading' | 'connected' | 'error';

type GmeClientContextValue = {
  client: GmeClient | null;
  state: ConnectionState;
  error: string | null;
  reconnect: () => void;
};

const GmeClientContext = createContext<GmeClientContextValue | null>(null);

function loadGmeScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('GME client can only load in the browser'));
  }

  if (window.GME?.classes?.Client && window.GME.gmeConfig) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-stams-gme="true"]`);
    if (existing) {
      const waitForConfig = () => {
        if (window.GME?.gmeConfig && window.GME.classes?.Client) {
          resolve();
          return;
        }
        window.setTimeout(waitForConfig, 50);
      };
      existing.addEventListener('load', waitForConfig, { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load WebGME client')), {
        once: true
      });
      waitForConfig();
      return;
    }

    const script = document.createElement('script');
    script.src = GME_CLASSES_SCRIPT;
    script.async = false;
    script.dataset.stamsGme = 'true';
    script.onload = () => {
      const waitForConfig = () => {
        if (window.GME?.gmeConfig && window.GME.classes?.Client) {
          resolve();
          return;
        }
        window.setTimeout(waitForConfig, 50);
      };
      waitForConfig();
    };
    script.onerror = () => reject(new Error(`Failed to load ${GME_CLASSES_SCRIPT}`));
    document.head.appendChild(script);
  });
}

function createAndConnectClient(): Promise<GmeClient> {
  return new Promise((resolve, reject) => {
    window.onGMEInit = () => {
      try {
        if (!window.GME?.classes?.Client || !window.GME.gmeConfig) {
          reject(new Error('WebGME client bundle did not initialize window.GME.gmeConfig'));
          return;
        }

        const client = new window.GME.classes.Client(window.GME.gmeConfig);
        client.mountedPath = '';

        // socket.io must expose window.io before connect (see ensureSocketIoGlobal).
        ensureSocketIoGlobal()
          .then(() => {
            client.connectToDatabase((err) => {
              if (err) {
                reject(err);
                return;
              }
              window.gmeClient = client;
              resolve(client);
            });
          })
          .catch(reject);
      } catch (connectError) {
        reject(connectError instanceof Error ? connectError : new Error('Failed to create GME client'));
      }
    };

    if (window.GME?.gmeConfig && window.GME.classes?.Client) {
      window.onGMEInit();
      return;
    }

    const body = document.body;
    if (!body.getAttribute('on-gme-init')) {
      body.setAttribute('on-gme-init', 'onGMEInit()');
    }

    void loadGmeScript().catch(reject);
  });
}

export function GmeClientProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<GmeClient | null>(null);
  const [state, setState] = useState<ConnectionState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const connectAttempt = useRef(0);

  const connect = useCallback(async () => {
    const attempt = ++connectAttempt.current;
    setSessionChecked(false);
    setState('loading');
    setError(null);
    setClient(null);

    try {
      await clearStaleStudioSession();
      if (attempt !== connectAttempt.current) {
        return;
      }
      setSessionChecked(true);

      const connectedClient = await createAndConnectClient();
      if (attempt !== connectAttempt.current) {
        return;
      }
      setClient(connectedClient);
      setState('connected');
    } catch (connectError) {
      if (attempt !== connectAttempt.current) {
        return;
      }
      setSessionChecked(true);
      const message =
        connectError instanceof Error ? connectError.message : 'Failed to connect to WebGME';
      setError(message);
      setState('error');
    }
  }, []);

  useEffect(() => {
    void connect();
  }, [connect]);

  const value = useMemo<GmeClientContextValue>(
    () => ({
      client,
      state,
      error,
      reconnect: connect
    }),
    [client, state, error, connect]
  );

  return <GmeClientContext.Provider value={value}>{sessionChecked ? children : null}</GmeClientContext.Provider>;
}

export function useGmeClient(): GmeClientContextValue {
  const context = useContext(GmeClientContext);
  if (!context) {
    throw new Error('useGmeClient must be used within GmeClientProvider');
  }
  return context;
}
