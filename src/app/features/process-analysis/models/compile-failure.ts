import type { ApiError } from '../../../core/models/api-error';
import type { Diagnostic } from '../../../core/models/diagnostic';
import { failureMessage } from './analysis-messages';

/** What to show for a failed compile. Decided by `kind` and the shape of `detail`, never by message text. */
export interface CompileFailureView {
  notice: string;
  diagnostics: Diagnostic[];
  line: number | null;
  column: number | null;
  /** The generated FlowSpec that failed to parse, when the backend returned it. */
  code: string | null;
}

const asNumber = (value: unknown): number | null => (typeof value === 'number' ? value : null);

export function compileFailureView(error: ApiError): CompileFailureView {
  const view: CompileFailureView = { notice: '', diagnostics: [], line: null, column: null, code: null };
  switch (error.kind) {
    case 'diagnostics':
      return { ...view, notice: 'No se pudo compilar el diagrama. Corrija los errores indicados.', diagnostics: error.diagnostics };
    case 'message': {
      const code = error.detail['flowspec_code'];
      return {
        ...view,
        notice:
          typeof code === 'string'
            ? 'El FlowSpec generado contiene un error de sintaxis.'
            : 'El servidor no pudo compilar el diagrama.',
        line: asNumber(error.detail['line']),
        column: asNumber(error.detail['column']),
        code: typeof code === 'string' ? code : null,
      };
    }
    case 'network':
    case 'validation':
      return { ...view, notice: failureMessage(error) };
    default:
      return { ...view, notice: 'Ocurrió un error inesperado al compilar el diagrama.' };
  }
}
