import { HttpErrorResponse } from '@angular/common/http';
import { toApiError } from './api-error';

const diagnostic = {
  severity: 'error',
  code: 'NO_END_EVENT',
  message:
    "FlowRouby import profile: process 'P' must contain an endEvent. This is a FlowRouby restriction, not a general BPMN rule.",
  elementId: null,
  elementType: 'endEvent',
  processId: 'P',
  blocksAnalysis: false,
  line: 3,
};

const fail = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

describe('toApiError', () => {
  it('maps an object detail with diagnostics', () => {
    const error = toApiError(
      fail(422, {
        detail: { message: 'The BPMN document could not be imported.', diagnostics: [diagnostic] },
      }),
    );
    expect(error).toEqual({
      kind: 'diagnostics',
      status: 422,
      message: 'The BPMN document could not be imported.',
      diagnostics: [diagnostic],
    });
  });

  it('maps a list detail to a validation error without diagnostics', () => {
    const issues = [{ type: 'missing', loc: ['body', 'file'], msg: 'Field required', input: null }];
    const error = toApiError(fail(422, { detail: issues }));
    expect(error).toEqual({ kind: 'validation', status: 422, issues });
  });

  it('maps an object detail without diagnostics to a message error, keeping the raw detail', () => {
    const detail = { message: 'Syntax error', line: 4, column: 2, flowspec_code: 'x' };
    expect(toApiError(fail(422, { detail }))).toEqual({ kind: 'message', status: 422, detail });
    expect(toApiError(fail(422, { detail: { message: 'Bad input_data' } }))).toEqual({
      kind: 'message',
      status: 422,
      detail: { message: 'Bad input_data' },
    });
  });

  it('maps status 0 to a network error', () => {
    const error = toApiError(fail(0, new ProgressEvent('error')));
    expect(error).toEqual({ kind: 'network', status: 0 });
  });

  it('maps anything else to an unknown error, keeping the status', () => {
    expect(toApiError(fail(500, 'Internal Server Error'))).toEqual({ kind: 'unknown', status: 500 });
    expect(toApiError(fail(502, null))).toEqual({ kind: 'unknown', status: 502 });
    expect(toApiError(fail(400, { detail: 'plain string' }))).toEqual({ kind: 'unknown', status: 400 });
  });
});
