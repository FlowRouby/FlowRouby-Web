import type { TraceValidationResult } from '../../../core/models/trace-validation-result';
import { PATH_MARKER, type PathCanvas } from './simulation-path';
import { toCanvasId } from './symbol-nodes';

/** Marker of the element where the trace was rejected. It wins over the path marker. */
export const REJECTED_MARKER = 'fr-rejected';

/**
 * Markers for the route consumed by one trace validation, translated with that response's `bpmn_node_ids`.
 * Each step paints its crossed gateways followed by its own node. A gateway takes every connection that enters it
 * from an element already on the route, which covers a parallel join reached from two branches. The node takes the
 * connections from the gateways of its step or, when it crossed none, the one from the most recent element that
 * leads to it, so a connection that skips over visited nodes is not painted. When the trace was rejected at a symbol that exists on the canvas, that element gets
 * the rejected marker. Symbols without a mapping or whose element is not on the canvas are skipped. Only ids that
 * exist on the canvas are returned.
 */
export function traceMarkers(result: TraceValidationResult, canvas: PathCanvas): Map<string, string> {
  const { bpmn_node_ids: nodeIds, validation } = result;
  const markers = new Map<string, string>();
  const painted: string[] = [];
  const toId = (symbol: string) => toCanvasId(symbol, nodeIds, (id) => canvas.hasElement(id));

  /** Marks the connection from `from` into `id`; false when the canvas has none. */
  const connect = (from: string, id: string): boolean => {
    const connection = canvas.connectionBetween(from, id);
    if (connection === null || !canvas.hasElement(connection)) return false;
    markers.set(connection, PATH_MARKER);
    return true;
  };
  const paint = (id: string) => {
    markers.set(id, PATH_MARKER);
    // The newest occurrence goes last, so a search from the end finds the element visited most recently.
    const at = painted.indexOf(id);
    if (at !== -1) painted.splice(at, 1);
    painted.push(id);
  };

  for (const step of validation.steps) {
    const gateways = step.via_gateways.map(toId).filter((id): id is string => id !== null);
    // A gateway can be a join, entered from several elements already on the route.
    for (const gateway of gateways) {
      painted.forEach((from) => connect(from, gateway));
      paint(gateway);
    }
    const node = toId(step.symbol);
    if (node === null) continue;
    if (gateways.length > 0) {
      gateways.forEach((gateway) => connect(gateway, node));
    } else {
      // Entered directly: only from the most recent element that leads to it, never from every earlier one.
      [...painted].reverse().some((from) => connect(from, node));
    }
    paint(node);
  }

  if (validation.rejected_at !== null) {
    const rejected = toId(validation.trace[validation.rejected_at] ?? '');
    if (rejected !== null) markers.set(rejected, REJECTED_MARKER);
  }
  return markers;
}
