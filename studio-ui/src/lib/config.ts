/**
 * WebGME assets are proxied through Next.js so the browser client connects to the
 * same origin (studio :4000) for both HTTP and WebSocket (socket.io).
 */
export const GME_CLASSES_SCRIPT = '/gme-dist/webgme.classes.build.js';

/** Endpoint where the WebGME server serves the matching socket.io client. */
export const SOCKET_IO_SCRIPT = '/socket.io/socket.io.js';

/**
 * Ensure `window.io` exists before the WebGME client connects.
 *
 * WebGME loads socket.io at runtime via requirejs. socket.io's UMD wrapper picks
 * its export target by environment detection; inside the Next.js/webpack bundle
 * it lands on neither the global nor a usable AMD result, so `window.io` is never
 * set and webgme's `io_ || window.io` fallback throws "io is not a function".
 *
 * We fetch the server-matched socket.io client and execute it with
 * `module`/`exports`/`define` shadowed, forcing the UMD's `global.io = factory()`
 * branch so `window.io` is reliably populated.
 */
export async function ensureSocketIoGlobal(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  if ((window as unknown as { io?: unknown }).io) {
    return;
  }

  const response = await fetch(SOCKET_IO_SCRIPT);
  if (!response.ok) {
    throw new Error(`Failed to load socket.io client (${response.status})`);
  }
  const source = await response.text();

  // Shadow module/exports/define so the UMD assigns to the global (window.io).
  const factory = new Function('module', 'exports', 'define', source);
  factory(undefined, undefined, undefined);

  if (!(window as unknown as { io?: unknown }).io) {
    throw new Error('socket.io client did not register window.io');
  }
}
