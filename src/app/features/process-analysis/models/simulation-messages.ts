import type { ApiError } from '../../../core/models/api-error';
import type { Diagnostic } from '../../../core/models/diagnostic';
import { failureMessage } from './analysis-messages';

/** Spanish label per backend termination code. `END_EVENT_REACHED` was observed; the others come from the simulator source. */
const TERMINATION_LABELS: Record<string, string> = {
  END_EVENT_REACHED: 'Se alcanzó un evento de fin',
  NO_START_NODE: 'El proceso no tiene un nodo de inicio',
  MAX_STEPS_EXCEEDED: 'Se superó el máximo de pasos permitido',
  DEADLOCK_OR_NO_TRANSITION: 'La ejecución se detuvo sin transición disponible',
};

/** Spanish label for a termination code, chosen by the code alone. Unknown codes keep the raw code visible. */
export function terminationLabel(code: string): string {
  return Object.hasOwn(TERMINATION_LABELS, code) ? TERMINATION_LABELS[code] : `Terminación no reconocida (${code})`;
}

/** Spanish label per node `kind` code observed on the live backend. */
const KIND_LABELS: Record<string, string> = {
  start: 'Inicio',
  end: 'Fin',
  user_task: 'Tarea de usuario',
  service_task: 'Tarea de servicio',
  exclusive_gateway: 'Compuerta exclusiva',
};

/** Spanish label for a step `kind`, or null when the code is unknown (the caller then shows the raw code). */
export function kindLabel(kind: string): string | null {
  return Object.hasOwn(KIND_LABELS, kind) ? KIND_LABELS[kind] : null;
}

/** What to show for a failed simulation. Decided by `kind` and the shape of `detail`, never by message text. */
export interface SimulationFailureView {
  notice: string;
  diagnostics: Diagnostic[];
  /** Backend text, secondary detail only. */
  detail: string | null;
}

export function simulationFailureView(error: ApiError): SimulationFailureView {
  switch (error.kind) {
    case 'diagnostics':
      return {
        notice: 'No se pudo simular el diagrama. Corrija los errores indicados.',
        diagnostics: error.diagnostics,
        detail: null,
      };
    case 'message': {
      const message = error.detail['message'];
      return {
        notice: 'El servidor no aceptó los datos de entrada. Verifique que sean un objeto JSON válido.',
        diagnostics: [],
        detail: typeof message === 'string' ? message : null,
      };
    }
    case 'network':
    case 'validation':
      return { notice: failureMessage(error), diagnostics: [], detail: null };
    default:
      return { notice: 'Ocurrió un error inesperado al simular el diagrama.', diagnostics: [], detail: null };
  }
}
