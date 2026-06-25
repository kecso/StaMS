/**
 * Langium LSP bootstrap worker (Phase 2).
 */

/// <reference lib="webworker" />

onmessage = (event: MessageEvent) => {
    const data = event.data;
    if (data && data.type === 'vfs-update') {
        // Phase 2: forward virtual FS snapshot to Langium services
    }
};

postMessage({type: 'langium-worker-ready'});
