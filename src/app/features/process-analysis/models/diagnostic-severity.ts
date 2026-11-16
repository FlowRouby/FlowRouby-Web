import type { Diagnostic, DiagnosticSeverity } from '../../../core/models/diagnostic';

const RANK: Record<DiagnosticSeverity, number> = { error: 0, warning: 1, info: 2 };

export const SEVERITY_LABELS: Record<DiagnosticSeverity, string> = {
  error: 'Error',
  warning: 'Advertencia',
  info: 'Información',
};

/** Comparator: errors first, then warnings, then info. */
export function bySeverity(a: Diagnostic, b: Diagnostic): number {
  return RANK[a.severity] - RANK[b.severity];
}

/** One canvas marker class per element id; the worst severity wins. Diagnostics without an element are skipped. */
export function markersFor(diagnostics: readonly Diagnostic[]): Map<string, string> {
  const worst = new Map<string, Diagnostic>();
  for (const diagnostic of diagnostics) {
    const id = diagnostic.elementId;
    if (id === null) continue;
    const current = worst.get(id);
    if (!current || RANK[diagnostic.severity] < RANK[current.severity]) worst.set(id, diagnostic);
  }
  return new Map([...worst].map(([id, d]) => [id, `fr-${d.severity}`]));
}
