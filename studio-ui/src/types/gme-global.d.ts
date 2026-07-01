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
  getActiveProjectId?: () => string | null;
  getActiveBranchName?: () => string | null;
  getActiveCommitHash?: () => string | null;
  runServerPlugin: (
    pluginId: string,
    context: {
      managerConfig: {
        project: string;
        branchName: string;
        commitHash: string;
        activeNode: string;
        activeSelection?: string[];
        namespace?: string;
      };
      pluginConfig: Record<string, unknown>;
    },
    callback: (err: Error | null, result: { success?: boolean; messages?: Array<{ severity: string; message: string }>; error?: string } | null) => void
  ) => void;
  addUI: (pattern: unknown, handler: (events: unknown[]) => void, guid?: string) => string;
  updateTerritory: (uiId: string, patterns: Record<string, { children: number }>) => void;
  removeUI: (uiId: string) => void;
  getNode: (path: string) => GmeClientNode | null;
  getAllMetaNodes?: (asObject?: boolean) => Record<string, GmeClientNode> | GmeClientNode[];
  CONSTANTS?: {
    TERRITORY_EVENT_LOAD?: string;
    TERRITORY_EVENT_UPDATE?: string;
    TERRITORY_EVENT_UNLOAD?: string;
    TERRITORY_EVENT_COMPLETE?: string;
    TERRITORY_EVENT_INCOMPLETE?: string;
    NEW_COMMIT_STATE?: string;
    [key: string]: string | undefined;
  };
  addEventListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeEventListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export type GmeClientNode = {
  getId: () => string;
  getAttribute: (name: string) => string | boolean | number | undefined;
  getAttributeNames?: () => string[];
  getChildrenIds: () => string[];
  getMetaTypeId?: () => string;
  getPointerNames?: () => string[];
  getPointer?: (pointerName: string) => { to: string | null; from: string[] };
  getPointerId?: (pointerName: string) => string | null;
  getParentId?: () => string | null;
  getRegistry?: (name: string) => string | null;
  isInstanceOf?: (baseId: string) => boolean;
  isTypeOf?: (typeId: string) => boolean;
};

export type GmeProjectRecord = {
  _id: string;
  name: string;
  owner?: string;
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
