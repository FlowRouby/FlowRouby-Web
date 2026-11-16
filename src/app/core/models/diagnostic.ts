export type DiagnosticSeverity = 'error' | 'warning' | 'info';

/** A backend finding about the imported BPMN. Decide logic by `code`, `severity` and `blocksAnalysis`, never by `message`. */
export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  elementId: string | null;
  elementType: string | null;
  processId: string | null;
  blocksAnalysis: boolean;
  line: number | null;
}
