import { toCanvasId } from './symbol-nodes';

/**
 * Labels for the canvas: BPMN element id mapped to its automaton symbol, read from the `bpmn_node_ids` of ONE compile
 * response. Symbols whose element is not on the canvas are skipped. If two symbols map to the same element the last
 * one wins, so every element carries a single label.
 */
export function symbolLabels(
  bpmnNodeIds: Readonly<Record<string, string>> | null,
  hasElement: (id: string) => boolean,
): Map<string, string> {
  const labels = new Map<string, string>();
  if (!bpmnNodeIds) return labels;
  for (const symbol of Object.keys(bpmnNodeIds)) {
    const id = toCanvasId(symbol, bpmnNodeIds, hasElement);
    if (id !== null) labels.set(id, symbol);
  }
  return labels;
}
