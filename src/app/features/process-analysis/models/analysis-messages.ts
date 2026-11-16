import type { ApiError } from '../../../core/models/api-error';

/** Spanish message per backend diagnostic `code` (contract section 4). The backend `message` is never the primary text. */
const DIAGNOSTIC_MESSAGES: Record<string, string> = {
  INVALID_UPLOAD: 'El archivo debe tener la extensión .bpmn o .xml.',
  XML_MALFORMED: 'El XML está mal formado o contiene elementos no permitidos (DTD o entidades).',
  NOT_BPMN: 'El documento no es BPMN 2.0: el elemento raíz debe ser «definitions» del espacio de nombres BPMN.',
  NO_PROCESS: 'El documento no contiene ningún proceso.',
  MISSING_ID: 'Falta un identificador (id) obligatorio.',
  DUPLICATE_ID: 'Hay un identificador (id) repetido.',
  MISSING_REF_ATTRIBUTE: 'Un flujo de secuencia no tiene sourceRef o targetRef.',
  INVALID_REFERENCE: 'Se hace referencia a un elemento que no existe.',
  NO_START_EVENT: 'El proceso no tiene un evento de inicio (restricción del perfil de FlowRouby).',
  NO_END_EVENT: 'El proceso no tiene un evento de fin (restricción del perfil de FlowRouby).',
  UNSUPPORTED_ELEMENT:
    'Este elemento todavía no es compatible; se conserva como nodo opaco y el análisis no se puede ejecutar.',
  MULTIPLE_START_EVENTS: 'Hay varios eventos de inicio; este caso aún no es compatible y el análisis no se puede ejecutar.',
  MULTIPLE_PROCESSES:
    'El documento contiene más de un proceso; este caso aún no es compatible y el análisis no se puede ejecutar.',
  PRESERVED_NOT_ANALYZABLE:
    'Este elemento se importa y es válido para generar código, pero queda fuera del perfil de análisis inicial; los resultados que lo involucren son provisionales.',
  DISCONNECTED_NODE: 'El nodo no tiene conexiones.',
  GATEWAY_WITHOUT_OUTGOING: 'La compuerta no tiene flujos de salida.',
  XOR_FLOW_WITHOUT_CONDITION_OR_DEFAULT:
    'Una salida de la compuerta exclusiva no tiene condición ni es la salida por defecto.',
  IGNORED_ELEMENT: 'Elemento no relevante para el análisis; se ignora.',
};

const FALLBACK_MESSAGE = 'Se detectó una incidencia en el diagrama.';

export const KNOWN_DIAGNOSTIC_CODES = Object.keys(DIAGNOSTIC_MESSAGES);

export function diagnosticMessage(code: string): string {
  return Object.hasOwn(DIAGNOSTIC_MESSAGES, code) ? DIAGNOSTIC_MESSAGES[code] : FALLBACK_MESSAGE;
}

/** Short Spanish notice for a failure that carries no diagnostics. Decided by `kind` only. */
export function failureMessage(error: ApiError): string {
  switch (error.kind) {
    case 'network':
      return 'No se pudo conectar con el servidor de análisis. Verifique que esté en ejecución e inténtelo de nuevo.';
    case 'validation':
      return 'El servidor no recibió un archivo válido para analizar.';
    case 'message':
      return 'El servidor rechazó la solicitud de análisis.';
    default:
      return 'Ocurrió un error inesperado al analizar el diagrama.';
  }
}

const DEADLOCK_LABELS: Record<string, string> = {
  GATEWAY_DEADLOCK: 'Bloqueo en una compuerta de convergencia',
  DEADLOCK_STATE: 'Estado del autómata sin salida',
};

/** Spanish label for a deadlock entry, chosen by `type`. The backend `message` is secondary detail only. */
export function deadlockLabel(type: string): string {
  return Object.hasOwn(DEADLOCK_LABELS, type) ? DEADLOCK_LABELS[type] : 'Bloqueo detectado';
}

/** Short Spanish notice for a failed ZIP download. */
export function downloadFailureMessage(error: ApiError): string {
  return error.kind === 'network'
    ? failureMessage(error)
    : 'No se pudo generar el archivo ZIP. Compile el diagrama para ver el detalle del problema.';
}
