import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toApiError } from '../models/api-error';
import type { SampleProcess } from '../models/sample-process';

const BASE_URL = `${environment.apiUrl}/api/v1/processes/samples`;

/** A failed request made with `responseType: 'text'` carries its JSON error body as a string; parse it back. */
function readTextError(error: HttpErrorResponse): HttpErrorResponse {
  if (typeof error.error !== 'string') return error;
  let body: unknown = null;
  try {
    body = JSON.parse(error.error);
  } catch {
    // Not JSON: it normalizes to an unknown failure.
  }
  return new HttpErrorResponse({ error: body, status: error.status, statusText: error.statusText, url: error.url ?? undefined });
}

@Service()
export class SampleApi {
  readonly #http = inject(HttpClient);

  /** Lists the sample diagrams. Failures are emitted as an `ApiError`. */
  list(): Observable<SampleProcess[]> {
    return this.#http.get<{ samples: SampleProcess[] }>(BASE_URL).pipe(
      map((response) => response.samples),
      catchError((error: HttpErrorResponse) => throwError(() => toApiError(error))),
    );
  }

  /** Fetches the BPMN XML of a sample. Failures are emitted as an `ApiError`. */
  xml(id: string): Observable<string> {
    return this.#http
      .get(`${BASE_URL}/${encodeURIComponent(id)}`, { responseType: 'text' })
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => toApiError(readTextError(error)))));
  }
}
