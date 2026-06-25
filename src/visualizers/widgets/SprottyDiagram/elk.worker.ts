/**
 * ELK layout worker (Phase 3). Receives a Sprotty graph, returns layouted positions.
 */
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

self.onmessage = async (event: MessageEvent) => {
    const {graph, requestId} = event.data as {graph: unknown; requestId: string};
    try {
        const layouted = await elk.layout(graph as Parameters<typeof elk.layout>[0]);
        self.postMessage({requestId, graph: layouted});
    } catch (error) {
        self.postMessage({requestId, error: String(error)});
    }
};

self.postMessage({type: 'elk-worker-ready'});
