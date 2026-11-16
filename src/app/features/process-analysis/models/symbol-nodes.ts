/**
 * Translates a compile/simulate node symbol (`task_1`) to a BPMN element id of the canvas.
 * Pass the `bpmn_node_ids` of the SAME response that produced the symbol. Returns null when the
 * symbol has no mapping or the mapped element is not on the canvas, so the canvas is never touched with a symbol.
 */
export function toCanvasId(
  symbol: string,
  bpmnNodeIds: Readonly<Record<string, string>> | null,
  hasElement: (id: string) => boolean,
): string | null {
  if (!bpmnNodeIds || !Object.hasOwn(bpmnNodeIds, symbol)) return null;
  const id = bpmnNodeIds[symbol];
  return hasElement(id) ? id : null;
}

/** Translates many symbols, skipping the ones `toCanvasId` cannot place on the canvas. */
export function toCanvasIds(
  symbols: readonly string[],
  bpmnNodeIds: Readonly<Record<string, string>> | null,
  hasElement: (id: string) => boolean,
): string[] {
  return symbols.flatMap((symbol) => toCanvasId(symbol, bpmnNodeIds, hasElement) ?? []);
}
