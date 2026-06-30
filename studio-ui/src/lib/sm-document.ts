/**
 * Local persistence for the single workspace `.sm` document.
 */

const DOC_KEY = 'stams:doc';

export function loadDoc(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(DOC_KEY);
}

export function saveDoc(text: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(DOC_KEY, text);
}
