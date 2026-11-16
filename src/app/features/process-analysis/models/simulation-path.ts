import { toCanvasId } from './symbol-nodes';

export const PATH_MARKER = 'fr-path';

/** The part of the canvas needed to place a route on it. */
export interface PathCanvas {
  hasElement(id: string): boolean;
  /** Id of a connection going from the first element to the second, or null. */
  connectionBetween(sourceId: string, targetId: string): string | null;
}

/**
 * Markers for the route `visited` (node symbols in execution order) of one simulation response, translated with
 * that response's `bpmnNodeIds`. Marks the visited elements and the connection between each consecutive pair of
 * them. Symbols without a mapping or whose element is not on the canvas are skipped, and a skipped node breaks the
 * chain, so no connection is invented across it. Only ids that exist on the canvas are returned.
 */
export function pathMarkers(
  visited: readonly string[],
  bpmnNodeIds: Readonly<Record<string, string>> | null,
  canvas: PathCanvas,
): Map<string, string> {
  const markers = new Map<string, string>();
  const ids = visited.map((symbol) => toCanvasId(symbol, bpmnNodeIds, (id) => canvas.hasElement(id)));
  ids.forEach((id, index) => {
    if (id === null) return;
    markers.set(id, PATH_MARKER);
    const previous = index > 0 ? ids[index - 1] : null;
    if (previous === null) return;
    const connection = canvas.connectionBetween(previous, id);
    if (connection !== null && canvas.hasElement(connection)) markers.set(connection, PATH_MARKER);
  });
  return markers;
}
