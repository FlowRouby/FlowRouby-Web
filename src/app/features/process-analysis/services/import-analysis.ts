import { computed, inject, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ApiError } from '../../../core/models/api-error';
import type { Diagnostic } from '../../../core/models/diagnostic';
import { ProcessApi } from '../../../core/services/process-api';
import { BpmnModeler } from '../../process-editor/services/bpmn-modeler';
import { markersFor } from '../models/diagnostic-severity';

export type ImportStatus = 'idle' | 'loading' | 'loaded' | 'failed';

const RECHECK_FILE_NAME = 'diagram.bpmn';

function asApiError(error: unknown): ApiError {
  const known = typeof error === 'object' && error !== null && 'kind' in error;
  return known ? (error as ApiError) : { kind: 'unknown', status: 0 };
}

/** Result of the last `/import` call for the diagram on the canvas. */
@Service()
export class ImportAnalysis {
  readonly #api = inject(ProcessApi);
  readonly #modeler = inject(BpmnModeler);

  readonly #status = signal<ImportStatus>('idle');
  readonly #diagnostics = signal<Diagnostic[]>([]);
  readonly #backendSupported = signal(false);
  readonly #failure = signal<ApiError | null>(null);
  readonly #stale = signal(false);
  /** Id of the newest request; older responses are ignored. */
  #latest = 0;

  /** `loaded` also covers a 422 with diagnostics; `failed` is a failure without diagnostics. */
  readonly status = this.#status.asReadonly();
  readonly diagnostics = this.#diagnostics.asReadonly();
  /** The failure when it carries no diagnostics (network, validation, message, unknown). */
  readonly failure = this.#failure.asReadonly();
  /** True when the diagram was edited after the last result, which may no longer describe it. */
  readonly stale = this.#stale.asReadonly();
  /** True only when the last 200 said so and the diagram has not changed since. */
  readonly supported = computed(
    () => this.#status() === 'loaded' && this.#backendSupported() && !this.#stale(),
  );
  /** True when the backend refused to import the diagram (error diagnostics). */
  readonly rejected = computed(() => this.#diagnostics().some((d) => d.severity === 'error'));

  constructor() {
    this.#modeler.onEdited(() => {
      if (this.#status() !== 'idle') this.#stale.set(true);
    });
  }

  /** Imports a user file and replaces any previous result. Sends the original file so `line` matches it. */
  async check(file: File): Promise<void> {
    this.#setDiagnostics([]);
    this.#backendSupported.set(false);
    this.#failure.set(null);
    this.#stale.set(false);
    await this.#send(file);
  }

  /** Re-imports the diagram as it is now on the canvas. */
  async recheck(): Promise<void> {
    // Claimed before exporting, so a file loaded while the export runs is not overwritten by this older diagram.
    const request = ++this.#latest;
    let xml: string;
    try {
      xml = await this.#modeler.exportXml();
    } catch {
      if (request === this.#latest) this.#fail({ kind: 'unknown', status: 0 });
      return;
    }
    if (request !== this.#latest) return;
    this.#stale.set(false);
    await this.#send(new File([xml], RECHECK_FILE_NAME, { type: 'application/xml' }), request);
  }

  async #send(file: File, request = ++this.#latest): Promise<void> {
    this.#status.set('loading');
    try {
      const result = await firstValueFrom(this.#api.importProcess(file));
      if (request !== this.#latest) return;
      this.#accept(result.diagnostics, result.supported);
    } catch (thrown) {
      if (request !== this.#latest) return;
      const error = asApiError(thrown);
      if (error.kind === 'diagnostics') this.#accept(error.diagnostics, false);
      else this.#fail(error);
    }
  }

  #accept(diagnostics: Diagnostic[], supported: boolean): void {
    this.#failure.set(null);
    this.#backendSupported.set(supported);
    this.#setDiagnostics(diagnostics);
    this.#status.set('loaded');
  }

  #fail(error: ApiError): void {
    this.#backendSupported.set(false);
    this.#setDiagnostics([]);
    this.#failure.set(error);
    this.#status.set('failed');
  }

  #setDiagnostics(diagnostics: Diagnostic[]): void {
    this.#diagnostics.set(diagnostics);
    this.#modeler.applyMarkers(markersFor(diagnostics));
  }
}
