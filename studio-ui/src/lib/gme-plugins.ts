import type { GmeClient } from '@/types/gme-global';

import { PROJECT_ROOT } from '@/lib/sm-diagram-from-client';

export type PluginRunResult = {
  success: boolean;
  messages?: Array<{ severity: string; message: string }>;
  error?: string;
};

type ServerPluginResult = {
  success?: boolean;
  messages?: Array<{ severity: string; message: string }>;
  error?: string;
};

/** WebGME project root — TextToModel writes Machine nodes here (not under /1 FCO). */
const DEFAULT_ACTIVE_NODE = PROJECT_ROOT;

/**
 * Run a server-side WebGME plugin on the active project branch.
 */
export function runServerPlugin(
  client: GmeClient,
  pluginId: string,
  pluginConfig: Record<string, unknown>,
  activeNode = DEFAULT_ACTIVE_NODE
): Promise<PluginRunResult> {
  const projectId = client.getActiveProjectId?.();
  const commitHash = client.getActiveCommitHash?.();
  const branchName = client.getActiveBranchName?.();

  if (!projectId || !commitHash || !branchName) {
    return Promise.reject(new Error('Model backend is not ready'));
  }

  return new Promise((resolve, reject) => {
    client.runServerPlugin(
      pluginId,
      {
        managerConfig: {
          project: projectId,
          branchName,
          commitHash,
          activeNode,
          activeSelection: [],
          namespace: ''
        },
        pluginConfig
      },
      (err: Error | null, result: ServerPluginResult | null) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({
          success: result?.success === true,
          messages: result?.messages,
          error: result?.error
        });
      }
    );
  });
}

export function runTextToModel(client: GmeClient, text: string): Promise<PluginRunResult> {
  return runServerPlugin(client, 'TextToModel', { text });
}
