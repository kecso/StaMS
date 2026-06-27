/**
 * Single in-memory workspace for this browser session (one WebGME project, one `.sm` doc).
 * The WebGME project id is kept internal — the UI only shows the document name.
 */

const PROJECT_ID_KEY = 'stams:workspace:projectId';
const DOC_NAME_KEY = 'stams:workspace:docName';
const DEFAULT_DOC_NAME = 'machine';

export const STUDIO_PATH = '/studio';

export function setWorkspace(projectId: string, docName = DEFAULT_DOC_NAME): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.setItem(PROJECT_ID_KEY, projectId);
  window.sessionStorage.setItem(DOC_NAME_KEY, docName);
}

export function getWorkspaceProjectId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.sessionStorage.getItem(PROJECT_ID_KEY);
}

export function getWorkspaceDocName(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_DOC_NAME;
  }
  return window.sessionStorage.getItem(DOC_NAME_KEY) ?? DEFAULT_DOC_NAME;
}

export function clearWorkspace(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.removeItem(PROJECT_ID_KEY);
  window.sessionStorage.removeItem(DOC_NAME_KEY);
}
