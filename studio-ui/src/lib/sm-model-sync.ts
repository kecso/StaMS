import type { GmeClient } from '@/types/gme-global';

import { runTextToModel } from '@/lib/gme-plugins';

export type ModelSyncStatus = 'idle' | 'pending' | 'synced' | 'skipped' | 'error';

export type ModelSyncResult = {
  status: ModelSyncStatus;
  message?: string;
  syncedAt?: number;
};

/**
 * Invoked when editor text is non-empty, error-free, and has been quiet for the debounce window.
 *
 * On success, the Diagram tab should subscribe to territory (`gme-territory`) and
 * build the view with `buildSmDiagramFromClient`.
 */
export async function syncModelFromText(
  client: GmeClient,
  text: string
): Promise<ModelSyncResult> {
  if (!text.trim()) {
    return { status: 'skipped', message: 'Empty document' };
  }

  try {
    const result = await runTextToModel(client, text);
    if (!result.success) {
      const detail =
        result.error ??
        result.messages?.map((message) => message.message).join('\n') ??
        'TextToModel plugin failed';
      return { status: 'error', message: detail };
    }

    return {
      status: 'synced',
      message: 'Model synced',
      syncedAt: Date.now()
    };
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : 'Model sync failed';
    return { status: 'error', message };
  }
}

/** Remove all Machine nodes from the project (empty document / Clear). */
export async function clearSyncedModel(client: GmeClient): Promise<ModelSyncResult> {
  try {
    const result = await runTextToModel(client, '');
    if (!result.success) {
      const detail =
        result.error ??
        result.messages?.map((message) => message.message).join('\n') ??
        'TextToModel plugin failed';
      return { status: 'error', message: detail };
    }

    return {
      status: 'synced',
      message: 'Model cleared',
      syncedAt: Date.now()
    };
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : 'Model clear failed';
    return { status: 'error', message };
  }
}
