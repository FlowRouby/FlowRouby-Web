import type { ImportStatus } from '../services/import-analysis';

/** The part of the import analysis needed to explain why an analysis action is unavailable. */
export interface ActionGate {
  supported(): boolean;
  stale(): boolean;
  status(): ImportStatus;
}

/** Why an action (`compilar`, `simular`) is disabled, decided from the analysis state (never from message text). */
export function blockedReason(gate: ActionGate, verb: 'compilar' | 'simular'): string | null {
  if (gate.supported()) return null;
  if (gate.stale()) return `El diagrama cambió; vuelva a verificarlo para ${verb}.`;
  switch (gate.status()) {
    case 'idle':
      return `Verifique el diagrama antes de ${verb}.`;
    case 'loading':
      return 'Verificando el diagrama…';
    default:
      return 'El diagrama todavía no se puede analizar.';
  }
}
