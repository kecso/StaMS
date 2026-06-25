export const WEBGME_URL = process.env.NEXT_PUBLIC_WEBGME_URL || 'http://localhost:8888';

export function getWebGmeApiBase(): string {
  if (typeof window === 'undefined') {
    return WEBGME_URL;
  }
  return '/api/webgme';
}
