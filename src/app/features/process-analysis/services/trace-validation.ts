import { computed, effect, inject, Service, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ApiError } from '../../../core/models/api-error';
import type { TraceValidationResult } from '../../../core/models/trace-validation-result';
import { ProcessApi } from '../../../core/services/process-api';
import { BpmnModeler } from '../../process-editor/services/bpmn-modeler';
import { parseTrace, type TraceInputKind } from '../models/trace-input';
import { traceMarkers } from '../models/trace-path';
import { ImportAnalysis } from './import-analysis';
import { PathHighlight } from './path-highlight';

export type TraceValidationStatus = 'idle' | 'loading' | 'loaded' | 'failed';

const FILE_NAME = 'diagram.bpmn';

function asApiError(error: unknown): ApiError {
  const known = typeof error === 'object' && error !== null && 'kind' in error;
  return known ? (error as ApiError) : { kind: 'unknown', status: 0 };
}

/**
 * Latest trace validation of the diagram on the canvas. The result, its node symbols and the highlighted route
 * describe one specific diagram, so they are dropped as soon as the diagram is edited, a file is imported or a new
 * check starts. The typed text and its kind are the user's own input and are kept.
 */
@Service()
export class TraceValidation {
  readonly #api = inject(ProcessApi);
  readonly #modeler = inject(BpmnModeler);
  readonly #analysis = inject(ImportAnalysis);
  readonly #highlight = inject(PathHighlight);

  readonly #status = signal<TraceValidationStatus>('idle');
  readonly #result = signal<TraceValidationResult | null>(null);
  readonly #failure = signal<ApiError | null>(null);
  readonly #inputText = signal('');
  readonly #inputKind = signal<TraceInputKind>('symbols');
  /** Id of the newest validation; older responses are ignored. */
  #latest = 0;

  readonly status = this.#status.asReadonly();
  readonly result = this.#result.asReadonly();
  readonly failure = this.#failure.asReadonly();
  /** The route text typed by the user. */
  readonly inputText = this.#inputText.asReadonly();
  /** Whether the typed tokens are DFA symbols or original diagram ids. */
  readonly inputKind = this.#inputKind.asReadonly();
  /** True while the route of this validation is highlighted on the canvas. */
  readonly pathShown = computed(() => this.#highlight.owner() === 'trace');
  /** Validation is allowed only for a diagram the backend said it can analyze. */
  readonly canValidate = computed(() => this.#analysis.supported() && this.#status() !== 'loading');

  constructor() {
    this.#modeler.onEdited(() => this.#discard());
    this.#modeler.onLoad(() => this.#discard());
    effect(() => {
      if (this.#analysis.status() === 'loading') untracked(() => this.#discard());
    });
  }

  setInput(text: string): void {
    this.#inputText.set(text);
  }

  setInputKind(kind: TraceInputKind): void {
    this.#inputKind.set(kind);
  }

  /** Validates the typed route against the diagram as it is now on the canvas. */
  async validate(): Promise<void> {
    if (!this.canValidate()) return;
    const trace = parseTrace(this.#inputText());
    const kind = this.#inputKind();
    const request = this.#begin();
    this.#status.set('loading');
    try {
      const xml = await this.#modeler.exportXml();
      const file = new File([xml], FILE_NAME, { type: 'application/xml' });
      const result = await firstValueFrom(this.#api.validateTrace(file, trace, kind));
      if (request !== this.#latest || !this.#analysis.supported()) return;
      this.#result.set(result);
      this.#status.set('loaded');
      this.#highlight.show('trace', traceMarkers(result, this.#modeler));
    } catch (thrown) {
      if (request !== this.#latest) return;
      this.#failure.set(asApiError(thrown));
      this.#status.set('failed');
    }
  }

  /** Removes the route from the canvas; the result stays. */
  clearPath(): void {
    this.#highlight.clear('trace');
  }

  /** Invalidates any request in flight and clears the previous outcome, including the route on the canvas. */
  #begin(): number {
    this.#result.set(null);
    this.#failure.set(null);
    this.clearPath();
    return ++this.#latest;
  }

  #discard(): void {
    this.#begin();
    this.#status.set('idle');
  }
}
