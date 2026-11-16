import type { ApiError } from '../../../core/models/api-error';
import { INVALID_INPUT_DATA_BODY } from '../../../core/testing/simulation-fixtures';
import { kindLabel, simulationFailureView, terminationLabel } from './simulation-messages';

describe('simulation messages', () => {
  it('labels the observed termination code in Spanish', () => {
    expect(terminationLabel('END_EVENT_REACHED')).toBe('Se alcanzó un evento de fin');
  });

  it('keeps the raw code of an unknown termination', () => {
    expect(terminationLabel('SOMETHING_NEW')).toContain('SOMETHING_NEW');
    expect(terminationLabel('toString')).toContain('toString');
  });

  it('labels known step kinds and returns null for unknown ones', () => {
    expect(kindLabel('exclusive_gateway')).toBe('Compuerta exclusiva');
    expect(kindLabel('parallel_gateway')).toBeNull();
    expect(kindLabel('constructor')).toBeNull();
  });

  describe('simulationFailureView', () => {
    it('keeps the diagnostics of a 422', () => {
      const error: ApiError = { kind: 'diagnostics', status: 422, message: 'raw', diagnostics: [] };
      const view = simulationFailureView(error);
      expect(view.notice).toContain('No se pudo simular');
      expect(view.notice).not.toContain('raw');
    });

    it('explains invalid input_data in Spanish and keeps the backend text as detail', () => {
      const view = simulationFailureView({ kind: 'message', status: 422, detail: INVALID_INPUT_DATA_BODY.detail });
      expect(view.notice).toContain('datos de entrada');
      expect(view.notice).not.toContain('Invalid input_data');
      expect(view.detail).toBe('Invalid input_data JSON: input_data must be a JSON object');
    });

    it('has no detail when the message is not a string', () => {
      expect(simulationFailureView({ kind: 'message', status: 422, detail: { message: 3 } }).detail).toBeNull();
    });

    it.each<[ApiError, string]>([
      [{ kind: 'network', status: 0 }, 'No se pudo conectar'],
      [{ kind: 'validation', status: 422, issues: [] }, 'no recibió un archivo válido'],
      [{ kind: 'unknown', status: 500 }, 'inesperado'],
    ])('reuses the shared notices (%#)', (error, text) => {
      expect(simulationFailureView(error).notice).toContain(text);
    });
  });
});
