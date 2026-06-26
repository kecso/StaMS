/**
 * WebGME assets are proxied through Next.js so the browser client connects to the
 * same origin (studio :4000) for both HTTP and WebSocket (socket.io).
 */
export const GME_CLASSES_SCRIPT = '/gme-dist/webgme.classes.build.js';
