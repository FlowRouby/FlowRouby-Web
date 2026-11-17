import type { HttpInterceptorFn } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

/** A backend request still unanswered after this long is treated as the server waking up. */
export const SLOW_AFTER_MS = 1500;

/** Tracks the requests sent to the backend, to tell the user when the server is taking long to answer. */
@Service()
export class ServerConnection {
  #pending = 0;
  #timer: ReturnType<typeof setTimeout> | null = null;
  readonly #slow = signal(false);

  /** True while some backend request has been waiting longer than `SLOW_AFTER_MS`. */
  readonly slow = this.#slow.asReadonly();

  begin(): void {
    this.#pending++;
    if (this.#pending === 1) this.#timer = setTimeout(() => this.#slow.set(true), SLOW_AFTER_MS);
  }

  end(): void {
    this.#pending = Math.max(0, this.#pending - 1);
    if (this.#pending > 0) return;
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = null;
    this.#slow.set(false);
  }
}

/** Reports every backend request to `ServerConnection`; requests to other hosts are ignored. */
export const serverConnectionInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiUrl)) return next(request);
  const connection = inject(ServerConnection);
  connection.begin();
  return next(request).pipe(finalize(() => connection.end()));
};
