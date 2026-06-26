/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Minimal typings for the WebGME client bundle served at /gme-dist/webgme.classes.build.js.
 * Model data flows through this client over WebSockets — not the REST API.
 */
export type GmeClient = {
  gmeConfig: Record<string, unknown>;
  mountedPath?: string;
  connectToDatabase: (callback: (err: Error | null) => void) => void;
  getProjects: (
    params: { info?: boolean; rights?: boolean },
    callback: (err: Error | null, projects: GmeProjectRecord[]) => void
  ) => void;
  seedProject: (
    params: {
      type?: 'file' | 'db' | 'blob';
      projectName: string;
      seedName: string;
      seedBranch?: string;
      ownerId?: string;
    },
    callback: (err: Error | null, result: { projectId: string }) => void
  ) => void;
  selectProject: (
    projectId: string,
    branchName: string | null,
    callback: (err: Error | null) => void
  ) => void;
  closeProject: (callback?: (err: Error | null) => void) => void;
  addUI: (pattern: unknown, handler: (events: unknown[]) => void, guid?: string) => string;
  updateTerritory: (uiId: string, patterns: Record<string, { children: number }>) => void;
  removeUI: (uiId: string) => void;
  getNode: (path: string) => GmeClientNode | null;
  CONSTANTS?: Record<string, string>;
  addEventListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeEventListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export type GmeClientNode = {
  getId: () => string;
  getAttribute: (name: string) => string;
  getChildrenIds: () => string[];
};

export type GmeProjectRecord = {
  _id: string;
  name: string;
  owner: string;
  info?: {
    kind?: string;
    modifiedAt?: string;
  };
};

declare global {
  interface Window {
    GME?: {
      gmeConfig: Record<string, unknown>;
      classes: {
        Client: new (gmeConfig: Record<string, unknown>) => GmeClient;
      };
    };
    onGMEInit?: () => void;
    gmeClient?: GmeClient;
  }
}

export {};
