import { SPROTTY_DIV_ID } from '@/lib/sprotty/diagram-container';
import type { SmHighlight } from '@/lib/sprotty/sm-to-sgraph';

function sprottyDomId(modelId: string): string {
  return `${SPROTTY_DIV_ID}_${modelId}`;
}

/**
 * Toggle trace-replay styling without calling `setModel` (which would re-run ELK
 * layout and reset the viewport to the diagram origin).
 */
export function applySmHighlight(highlight?: SmHighlight): void {
  const host = document.getElementById(SPROTTY_DIV_ID);
  if (!host) {
    return;
  }

  host.querySelectorAll('.sm-state-active').forEach((element) => {
    element.classList.remove('sm-state-active');
  });
  host.querySelectorAll('.sm-transition-active').forEach((element) => {
    element.classList.remove('sm-transition-active');
  });

  if (highlight?.activeStateId) {
    document.getElementById(sprottyDomId(highlight.activeStateId))?.classList.add('sm-state-active');
  }
  if (highlight?.activeTransitionId) {
    document.getElementById(sprottyDomId(highlight.activeTransitionId))?.classList.add('sm-transition-active');
  }
}
