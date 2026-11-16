import type { ApiError } from '../../../core/models/api-error';
import { compileFailureView } from './compile-failure';
import { deadlockLabel, downloadFailureMessage, loopLabel } from './analysis-messages';

describe('compileFailureView', () => {
  it('carries the diagnostics of a 422 with diagnostics', () => {
    const view = compileFailureView({
      kind: 'diagnostics',
      status: 422,
      message: 'x',
      diagnostics: [{ code: 'NO_END_EVENT' } as never],
    });
    expect(view.diagnostics).toHaveLength(1);
    expect(view.line).toBeNull();
  });

  it('exposes line, column and the FlowSpec of a syntax error', () => {
    const view = compileFailureView({
      kind: 'message',
      status: 422,
      detail: { message: 'Unexpected', line: 4, column: 7, flowspec_code: 'process "x"' },
    });
    expect(view.notice).toContain('error de sintaxis');
    expect([view.line, view.column, view.code]).toEqual([4, 7, 'process "x"']);
  });

  it('handles a message failure without position', () => {
    const view = compileFailureView({ kind: 'message', status: 422, detail: { message: 'boom' } });
    expect([view.line, view.column, view.code]).toEqual([null, null, null]);
    expect(view.notice).not.toContain('boom');
  });

  it('reuses the import notices for network and validation failures', () => {
    expect(compileFailureView({ kind: 'network', status: 0 }).notice).toContain('No se pudo conectar');
    expect(compileFailureView({ kind: 'validation', status: 422, issues: [] }).notice).toContain('archivo válido');
  });

  it('falls back for an unknown failure', () => {
    expect(compileFailureView({ kind: 'unknown', status: 500 } as ApiError).notice).toContain('inesperado');
  });
});

describe('deadlock and download messages', () => {
  it('labels deadlocks by type with a generic fallback', () => {
    expect(deadlockLabel('GATEWAY_DEADLOCK')).toContain('compuerta');
    expect(deadlockLabel('DEADLOCK_STATE')).toContain('autómata');
    expect(deadlockLabel('SOMETHING_NEW')).toBe('Bloqueo detectado');
  });

  it('labels loop findings by type with a generic fallback', () => {
    expect(loopLabel('VALID_LOOP')).toBe('Ciclo controlado, con salida hacia un evento de fin');
    expect(loopLabel('INFINITE_LOOP_TRAP')).toBe('Ciclo sin salida');
    expect(loopLabel('SOMETHING_NEW')).toBe('Ciclo detectado');
  });

  it('words a download failure', () => {
    expect(downloadFailureMessage({ kind: 'network', status: 0 })).toContain('No se pudo conectar');
    expect(downloadFailureMessage({ kind: 'unknown', status: 500 })).toContain('ZIP');
  });
});
