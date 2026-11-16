import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toApiError } from '../models/api-error';
import type { ImportResult } from '../models/import-result';

@Service()
export class ProcessApi {
  readonly #http = inject(HttpClient);

  /** Imports a BPMN file. Failures are emitted as an `ApiError`. */
  importProcess(file: File): Observable<ImportResult> {
    const body = new FormData();
    body.append('file', file);
    return this.#http
      .post<ImportResult>(`${environment.apiUrl}/api/v1/processes/import`, body)
      .pipe(
        catchError((error: HttpErrorResponse) => throwError(() => toApiError(error))),
      );
  }
}
