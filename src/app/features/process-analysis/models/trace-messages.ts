import type { ApiError } from '../../../core/models/api-error';
import type { Diagnostic } from '../../../core/models/diagnostic';
import { failureMessage } from './analysis-messages';

/** Spanish explanation per `rejection_reason` code (contract section 1.2). */
const REJECTION_MESSAGES: Record<string, string> = {
  UNKNOWN_SYMBOL:
    'El símbolo no forma parte del alfabeto del autómata: no existe en el diagrama o es una compuerta.',
  NO_TRANSITION: 'No hay una transición con ese símbolo desde el estado actual.',
  NOT_ACCEPTING_STATE:
    'La cadena se leyó completa, pero el autómata no terminó en un estado de aceptación.',
};

const FALLBACK_REJECTION = 'La cadena fue rechazada por un motivo que esta versión no reconoce.';

/** Spanish explanation of a rejection, chosen by the code alone. Unknown codes get a generic text. */
export function rejectionMessage(code: string | null): string {
  return code !== null && Object.hasOwn(REJECTION_MESSAGES, code) ? REJECTION_MESSAGES[code] : FALLBACK_REJECTION;
}

/** What to show for a failed validation. Decided by `kind`, never by message text. */
export interface TraceFailureView {
  notice: string;
  diagnostics: Diagnostic[];
}

export function traceFailureView(error: ApiError): TraceFailureView {
  switch (error.kind) {
    case 'diagnostics':
      return { notice: 'No se pudo validar la cadena. Corrija los errores indicados en el diagrama.', diagnostics: error.diagnostics };
    case 'message':
      return {
        notice: 'El servidor no pudo interpretar la cadena tal como se escribió. Revise el texto e inténtelo de nuevo.',
        diagnostics: [],
      };
    case 'network':
    case 'validation':
      return { notice: failureMessage(error), diagnostics: [] };
    default:
      return { notice: 'Ocurrió un error inesperado al validar la cadena.', diagnostics: [] };
  }
}
