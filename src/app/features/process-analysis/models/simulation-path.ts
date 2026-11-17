import type { StepLog } from '../../../core/models/simulation-result';
import { toCanvasId } from './symbol-nodes';

export const PATH_MARKER = 'fr-path';

/** The part of the canvas needed to place a route on it. */
export interface PathCanvas {
  hasElement(id: string): boolean;
  /** Id of a connection going from the first element to the second, or null. */
  connectionBetween(sourceId: string, targetId: string): string | null;
}

/**
 * Markers for the route of one simulation response, read from its `steps` and translated with that response's
 * `bpmnNodeIds`. Marks every executed element and the connections the run followed out of each one:
 *
 * - a step with `selected_targets` (a gateway) followed exactly the connections to those targets, so a parallel
 *   split marks all its branches, a waiting join marks none, and an exclusive gateway marks only the chosen one;
 * - any other step (an event or a task) followed all its outgoing connections.
 *
 * A connection is marked only when the element it leads to was executed too. Consecutive steps are not assumed to
 * be connected: parallel branches run one after the other without a connection between them. Symbols without a
 * mapping or whose element is not on the canvas are skipped. Only ids that exist on the canvas are returned.
 */
export function pathMarkers(
  steps: readonly Pick<StepLog, 'node_id' | 'selected_targets'>[],
  bpmnNodeIds: Readonly<Record<string, string>> | null,
  canvas: PathCanvas,
): Map<string, string> {
  const resolved = new Map<string, string | null>();
  const toId = (symbol: string): string | null => {
    if (!resolved.has(symbol)) resolved.set(symbol, toCanvasId(symbol, bpmnNodeIds, (id) => canvas.hasElement(id)));
    return resolved.get(symbol) ?? null;
  };

  const markers = new Map<string, string>();
  for (const step of steps) {
    const id = toId(step.node_id);
    if (id !== null) markers.set(id, PATH_MARKER);
  }
  const executed = [...markers.keys()];

  for (const step of steps) {
    const from = toId(step.node_id);
    if (from === null) continue;
    const targets = step.selected_targets ? step.selected_targets.map(toId).filter((id) => id !== null && executed.includes(id)) : executed;
    for (const to of targets) {
      const connection = canvas.connectionBetween(from, to as string);
      if (connection !== null && canvas.hasElement(connection)) markers.set(connection, PATH_MARKER);
    }
  }
  return markers;
}
