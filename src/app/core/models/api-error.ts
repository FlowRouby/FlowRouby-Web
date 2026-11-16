import { HttpErrorResponse } from '@angular/common/http';
import type { Diagnostic } from './diagnostic';

/** FastAPI request validation entry. */
export interface ValidationIssue {
  type: string;
  loc: (string | number)[];
  msg: string;
  input: unknown;
}

/**
 * A backend failure, told apart by the shape of the response `detail` (never by message text).
 * `status` is the HTTP status, or 0 when there was no response.
 */
export type ApiError =
  | { kind: 'diagnostics'; status: number; message: string | null; diagnostics: Diagnostic[] }
  | { kind: 'validation'; status: number; issues: ValidationIssue[] }
  | { kind: 'message'; status: number; detail: Record<string, unknown> }
  | { kind: 'network'; status: number }
  | { kind: 'unknown'; status: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Maps an HTTP failure to an `ApiError`. Pure: decided only by status and the shape of `detail`. */
export function toApiError(response: HttpErrorResponse): ApiError {
  const status = response.status;
  if (status === 0) return { kind: 'network', status };

  const body: unknown = response.error;
  const detail = isRecord(body) ? body['detail'] : undefined;

  if (Array.isArray(detail)) {
    return { kind: 'validation', status, issues: detail as ValidationIssue[] };
  }
  if (isRecord(detail)) {
    const diagnostics = detail['diagnostics'];
    if (Array.isArray(diagnostics)) {
      const message = typeof detail['message'] === 'string' ? detail['message'] : null;
      return { kind: 'diagnostics', status, message, diagnostics: diagnostics as Diagnostic[] };
    }
    return { kind: 'message', status, detail };
  }
  return { kind: 'unknown', status };
}
