/**
 * Subscribe to a WebGME territory so the client caches a subtree's nodes.
 *
 * The server plugin (TextToModel) writes to the project; the browser client
 * only sees nodes after a UI territory includes them. Diagram builders depend
 * on this subscription being active.
 *
 * ## Lifecycle: keep the territory open
 *
 * The territory/UI connection should live as long as the project is open and a
 * visualizer is active — do NOT release after a single read. Releasing removes
 * the territory and the client may unload its nodes, emptying later snapshots.
 * Release only when the visualizer is torn down (React effect cleanup) or the
 * project closes.
 *
 * ## Depth note
 *
 * The WebGME client only loads descendants when the pattern's `children` depth is
 * a positive integer (`if (pattern.children > 0)` in client.js). `-1` does NOT
 * mean "whole subtree" here — it loads only the root. We pass a large finite depth
 * (`SUBTREE_DEPTH`) to cover the shallow StaMS tree (root → machine → state/transition).
 *
 * ## Completion semantics
 *
 * For a deep territory the client invokes the callback multiple
 * times as each level streams in. Acting on the first `load` for the root is
 * wrong — descendants are not loaded yet. The client prepends a synthetic event
 * to every batch:
 *
 * - `{ etype: 'complete', eid: null }`   — territory fully satisfied for the
 *   current commit; all requested nodes are cached. Safe to read/re-render.
 * - `{ etype: 'incomplete', eid: null }` — still streaming; more batches follow.
 *
 * So `onComplete` fires once per `complete` batch (initial load and again after
 * any later commit). Competing commits are safe: each `complete` reflects a
 * consistent, fully-cached territory, so re-reading then is always correct.
 *
 * ## Usage (React)
 *
 * ```ts
 * useEffect(() => {
 *   if (!client || workspaceState !== 'open') return;
 *   const sub = subscribeProjectTerritory(client, PROJECT_ROOT, () => {
 *     const view = buildSmDiagramFromClient(client);
 *     setView(view);
 *   });
 *   return () => sub.release();
 * }, [client, workspaceState]);
 * ```
 */

import type { GmeClient } from '@/types/gme-global';

import { PROJECT_ROOT } from '@/lib/sm-diagram-from-client';

type TerritoryEvent = { etype?: string; eid?: string | null };

export type TerritoryHandle = {
  uiId: string;
  release: () => void;
};

/**
 * Depth covering the whole StaMS tree with headroom. WebGME requires a positive
 * `children` value to load descendants at all (negative/zero loads only the root).
 */
const SUBTREE_DEPTH = 100;

export type TerritoryOptions = {
  /** Levels of descendants to include. Must be > 0 to load any children. */
  children?: number;
};

const DEFAULT_OPTIONS: Required<TerritoryOptions> = {
  children: SUBTREE_DEPTH
};

/**
 * Open a territory for `rootPath` and invoke `onComplete` every time the client
 * reports `complete` (initial load and after subsequent commits). The territory
 * stays open until `release()` is called — keep it for the visualizer lifetime.
 */
export function subscribeProjectTerritory(
  client: GmeClient,
  rootPath: string = PROJECT_ROOT,
  onComplete: () => void,
  options: TerritoryOptions = {}
): TerritoryHandle {
  const { children } = { ...DEFAULT_OPTIONS, ...options };
  const completeEvent = client.CONSTANTS?.TERRITORY_EVENT_COMPLETE ?? 'complete';

  let uiId: string | undefined;
  let released = false;

  const release = () => {
    if (released) {
      return;
    }
    released = true;
    if (uiId) {
      client.removeUI(uiId);
      uiId = undefined;
    }
  };

  const handler = (events: unknown[]) => {
    const typed = events as TerritoryEvent[];
    const summary = typed.reduce<Record<string, number>>((acc, event) => {
      const key = event.etype ?? 'unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    // eslint-disable-next-line no-console
    console.log('[SmTerritory] events for', JSON.stringify(rootPath), summary);
    const hasComplete = typed.some((event) => event.etype === completeEvent);
    if (hasComplete) {
      // Territory fully cached for the current commit — safe to snapshot/render.
      // eslint-disable-next-line no-console
      console.log('[SmTerritory] complete → rebuilding diagram');
      onComplete();
    }
    // `incomplete` batches are intentionally ignored — more will follow.
  };

  uiId = client.addUI({}, handler);
  // eslint-disable-next-line no-console
  console.log('[SmTerritory] opening territory', JSON.stringify(rootPath), 'children:', children, 'uiId:', uiId);
  client.updateTerritory(uiId, {
    [rootPath]: { children }
  });

  return { uiId: uiId as string, release };
}
