import type { TraceValidationResult } from '../../../core/models/trace-validation-result';
import { PATH_MARKER, type PathCanvas } from './simulation-path';
import { toCanvasId } from './symbol-nodes';

/** Marker of the element where the trace was rejected. It wins over the path marker. */
export const REJECTED_MARKER = 'fr-rejected';

/**
 * Markers for the route consumed by one trace validation, translated with that response's `bpmn_node_ids`.
 * Each step paints its crossed gateways followed by its own node, and every connection that enters one of them from
 * an element already painted (earlier steps or earlier members of the same step). That also covers a parallel join
 * reached from two branches. When the trace was rejected at a symbol that exists on the canvas, that element gets
 * the rejected marker. Symbols without a mapping or whose element is not on the canvas are skipped. Only ids that
 * exist on the canvas are returned.
 */
export function traceMarkers(result: TraceValidationResult, canvas: PathCanvas): Map<string, string> {
  const { bpmn_node_ids: nodeIds, validation } = result;
  const markers = new Map<string, string>();
  const painted: string[] = [];
  const toId = (symbol: string) => toCanvasId(symbol, nodeIds, (id) => canvas.hasElement(id));

  for (const step of validation.steps) {
    for (const symbol of [...step.via_gateways, step.symbol]) {
      const id = toId(symbol);
      if (id === null) continue;
      for (const from of painted) {
        const connection = canvas.connectionBetween(from, id);
        if (connection !== null && canvas.hasElement(connection)) markers.set(connection, PATH_MARKER);
      }
      markers.set(id, PATH_MARKER);
      if (!painted.includes(id)) painted.push(id);
    }
  }

  if (validation.rejected_at !== null) {
    const rejected = toId(validation.trace[validation.rejected_at] ?? '');
    if (rejected !== null) markers.set(rejected, REJECTED_MARKER);
  }
  return markers;
}
