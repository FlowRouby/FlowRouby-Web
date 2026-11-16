import type { ApiError } from '../../../core/models/api-error';
import { INVALID_TRACE_BODY } from '../../../core/testing/trace-validation-fixtures';
import { rejectionMessage, traceFailureView } from './trace-messages';

describe('trace messages', () => {
  describe('rejectionMessage', () => {
    it.each<[string, string]>([
      ['UNKNOWN_SYMBOL', 'alfabeto del autómata'],
      ['NO_TRANSITION', 'No hay una transición'],
      ['NOT_ACCEPTING_STATE', 'estado de aceptación'],
    ])('explains %s in Spanish', (code, expected) => {
      expect(rejectionMessage(code)).toContain(expected);
    });

    it('uses a generic text for an unknown or missing code', () => {
      expect(rejectionMessage('SOMETHING_NEW')).toContain('no reconoce');
      expect(rejectionMessage('toString')).toContain('no reconoce');
      expect(rejectionMessage(null)).toContain('no reconoce');
    });
  });

  describe('traceFailureView', () => {
    it('keeps the diagnostics of a 422', () => {
      const error: ApiError = { kind: 'diagnostics', status: 422, message: 'raw', diagnostics: [] };
      const view = traceFailureView(error);
      expect(view.notice).toContain('No se pudo validar');
      expect(view.notice).not.toContain('raw');
    });

    it('explains a bad trace in Spanish and never shows the backend text', () => {
      const view = traceFailureView({ kind: 'message', status: 422, detail: INVALID_TRACE_BODY.detail });
      expect(view.notice).toContain('tal como se escribió');
      expect(JSON.stringify(view)).not.toContain('Invalid trace');
    });

    it.each<[ApiError, string]>([
      [{ kind: 'network', status: 0 }, 'No se pudo conectar'],
      [{ kind: 'validation', status: 422, issues: [] }, 'no recibió un archivo válido'],
      [{ kind: 'unknown', status: 500 }, 'inesperado'],
    ])('reuses the shared notices (%#)', (error, text) => {
      expect(traceFailureView(error).notice).toContain(text);
    });
  });
});
