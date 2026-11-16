import { computed, effect, inject, Service, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ApiError } from '../../../core/models/api-error';
import type { SimulationResult } from '../../../core/models/simulation-result';
import { ProcessApi } from '../../../core/services/process-api';
import { BpmnModeler } from '../../process-editor/services/bpmn-modeler';
import { parseInputData } from '../models/simulation-input';
import { pathMarkers } from '../models/simulation-path';
import { ImportAnalysis } from './import-analysis';
import { PathHighlight } from './path-highlight';

export type SimulationStatus = 'idle' | 'loading' | 'loaded' | 'failed';

const FILE_NAME = 'diagram.bpmn';

function asApiError(error: unknown): ApiError {
  const known = typeof error === 'object' && error !== null && 'kind' in error;
  return known ? (error as ApiError) : { kind: 'unknown', status: 0 };
}

/**
 * Latest simulation of the diagram on the canvas. The result, its node symbols and the highlighted route describe one
 * specific diagram, so they are dropped as soon as the diagram is edited, a file is imported or a new check starts.
 */
@Service()
export class SimulationAnalysis {
  readonly #api = inject(ProcessApi);
  readonly #modeler = inject(BpmnModeler);
  readonly #analysis = inject(ImportAnalysis);
  readonly #highlight = inject(PathHighlight);

  readonly #status = signal<SimulationStatus>('idle');
  readonly #result = signal<SimulationResult | null>(null);
  readonly #failure = signal<ApiError | null>(null);
  readonly #inputText = signal('');
  readonly #inputInvalid = signal(false);
  /** Id of the newest simulation; older responses are ignored. */
  #latest = 0;

  readonly status = this.#status.asReadonly();
  readonly result = this.#result.asReadonly();
  readonly failure = this.#failure.asReadonly();
  /** The `input_data` text typed by the user; it is kept across discards because it is the user's own input. */
  readonly inputText = this.#inputText.asReadonly();
  /** True when the last attempt was blocked because the text is not a JSON object. */
  readonly inputInvalid = this.#inputInvalid.asReadonly();
  /** True while the traversed route of this simulation is highlighted on the canvas. */
  readonly pathShown = computed(() => this.#highlight.owner() === 'simulation');
  /** Simulation is allowed only for a diagram the backend said it can analyze. */
  readonly canSimulate = computed(() => this.#analysis.supported() && this.#status() !== 'loading');

  constructor() {
    this.#modeler.onEdited(() => this.#discard());
    this.#modeler.onLoad(() => this.#discard());
    effect(() => {
      if (this.#analysis.status() === 'loading') untracked(() => this.#discard());
    });
  }

  setInput(text: string): void {
    this.#inputText.set(text);
    this.#inputInvalid.set(false);
  }

  /** Simulates the diagram as it is now on the canvas. Invalid `input_data` never reaches the backend. */
  async simulate(): Promise<void> {
    if (!this.canSimulate()) return;
    const input = parseInputData(this.#inputText());
    this.#inputInvalid.set(input.kind === 'invalid');
    if (input.kind === 'invalid') return;
    const request = this.#begin();
    this.#status.set('loading');
    try {
      const xml = await this.#modeler.exportXml();
      const file = new File([xml], FILE_NAME, { type: 'application/xml' });
      const result = await firstValueFrom(this.#api.simulate(file, input.kind === 'data' ? input.json : undefined));
      if (request !== this.#latest || !this.#analysis.supported()) return;
      this.#result.set(result);
      this.#status.set('loaded');
      this.#showPath(result);
    } catch (thrown) {
      if (request !== this.#latest) return;
      this.#failure.set(asApiError(thrown));
      this.#status.set('failed');
    }
  }

  /** Removes the route from the canvas; the result stays. */
  clearPath(): void {
    this.#highlight.clear('simulation');
  }

  #showPath(result: SimulationResult): void {
    const markers = pathMarkers(result.simulation.visited_nodes, result.bpmn_node_ids, this.#modeler);
    this.#highlight.show('simulation', markers);
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
