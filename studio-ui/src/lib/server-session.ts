const SERVER_SESSION_KEY = 'stams:server:bootId';
const SESSION_URL = '/api/stams/session';
const STAMS_STORAGE_PREFIX = 'stams:';

type ServerSessionResponse = {
  bootId?: string;
};

function clearStamsStorage(storage: Storage): void {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(STAMS_STORAGE_PREFIX)) {
      storage.removeItem(key);
    }
  }
}

function clearStudioSession(): void {
  clearStamsStorage(window.sessionStorage);
  clearStamsStorage(window.localStorage);
}

/**
 * The WebGME backend is intentionally ephemeral in normal StaMS runs. A backend
 * restart invalidates all cached project ids and document drafts, so compare a
 * per-process boot id before connecting and wipe browser-side state on mismatch.
 */
export async function clearStaleStudioSession(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const response = await fetch(SESSION_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to read StaMS server session (${response.status})`);
  }

  const payload = (await response.json()) as ServerSessionResponse;
  const bootId = payload.bootId;
  if (!bootId) {
    throw new Error('StaMS server session response did not include bootId');
  }

  const previousBootId = window.localStorage.getItem(SERVER_SESSION_KEY);
  if (previousBootId !== bootId) {
    clearStudioSession();
    window.localStorage.setItem(SERVER_SESSION_KEY, bootId);
  }
}
