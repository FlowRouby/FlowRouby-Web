import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, from, mergeMap, Observable, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toApiError } from '../models/api-error';
import type { CompileResult, ProjectArchive } from '../models/compile-result';
import type { ImportResult } from '../models/import-result';
import type { SimulationResult } from '../models/simulation-result';

const DEFAULT_ARCHIVE_NAME = 'project.zip';

/** A failed request made with `responseType: 'blob'` carries its JSON error body as a Blob; parse it back. */
async function readBlobError(error: HttpErrorResponse): Promise<HttpErrorResponse> {
  if (!(error.error instanceof Blob)) return error;
  let body: unknown = null;
  try {
    body = JSON.parse(await error.error.text());
  } catch {
    // Not JSON: it normalizes to an unknown failure.
  }
  return new HttpErrorResponse({ error: body, status: error.status, statusText: error.statusText, url: error.url ?? undefined });
}

function archiveName(disposition: string | null): string {
  const header = disposition ?? '';
  const encoded = /filename\*\s*=\s*[^']*'[^']*'([^;]+)/i.exec(header)?.[1]?.trim();
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      // Malformed percent-encoding: use the plain parameter or the default.
    }
  }
  return /filename\s*=\s*"?([^";]+)"?/i.exec(header)?.[1]?.trim() || DEFAULT_ARCHIVE_NAME;
}

@Service()
export class ProcessApi {
  readonly #http = inject(HttpClient);

  /** Imports a BPMN file. Failures are emitted as an `ApiError`. */
  importProcess(file: File): Observable<ImportResult> {
    return this.#http
      .post<ImportResult>(`${environment.apiUrl}/api/v1/processes/import`, this.#form(file))
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => toApiError(error))));
  }

  /** Compiles a BPMN file. Failures are emitted as an `ApiError`. */
  compile(file: File): Observable<CompileResult> {
    return this.#http
      .post<CompileResult>(`${environment.apiUrl}/api/v1/processes/compile`, this.#form(file))
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => toApiError(error))));
  }

  /** Simulates a route of a BPMN file. `inputData` is a JSON string sent only when provided. Failures are emitted as an `ApiError`. */
  simulate(file: File, inputData?: string): Observable<SimulationResult> {
    const body = this.#form(file);
    if (inputData !== undefined) body.append('input_data', inputData);
    return this.#http
      .post<SimulationResult>(`${environment.apiUrl}/api/v1/processes/simulate`, body)
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => toApiError(error))));
  }

  /** Compiles a BPMN file and returns the generated Rails project as a ZIP. Failures are emitted as an `ApiError`. */
  downloadProject(file: File): Observable<ProjectArchive> {
    return this.#http
      .post(`${environment.apiUrl}/api/v1/processes/compile`, this.#form(file), {
        params: { format: 'zip' },
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(
        map((response) => ({
          blob: response.body as Blob,
          fileName: archiveName(response.headers.get('Content-Disposition')),
        })),
        catchError((error: HttpErrorResponse) =>
          from(readBlobError(error)).pipe(mergeMap((parsed) => throwError(() => toApiError(parsed)))),
        ),
      );
  }

  #form(file: File): FormData {
    const body = new FormData();
    body.append('file', file);
    return body;
  }
}
