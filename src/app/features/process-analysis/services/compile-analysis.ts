import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Service, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ApiError } from '../../../core/models/api-error';
import type { CompileResult } from '../../../core/models/compile-result';
import { ProcessApi } from '../../../core/services/process-api';
import { BpmnModeler } from '../../process-editor/services/bpmn-modeler';
import { symbolLabels } from '../models/symbol-labels';
import { ImportAnalysis } from './import-analysis';

export type CompileStatus = 'idle' | 'loading' | 'loaded' | 'failed';

/** Overlay group of the symbol labels; they live exactly as long as the compile result they were read from. */
const LABEL_GROUP = 'symbols';

const FILE_NAME = 'diagram.bpmn';

function asApiError(error: unknown): ApiError {
  const known = typeof error === 'object' && error !== null && 'kind' in error;
  return known ? (error as ApiError) : { kind: 'unknown', status: 0 };
}

/**
 * Latest compile of the diagram on the canvas. The result and its node symbols describe one specific
 * diagram, so they are dropped as soon as the diagram is edited, a file is imported or a new check starts. The same
 * result puts a symbol label on each mapped canvas element, removed together with it.
 */
@Service()
export class CompileAnalysis {
  readonly #api = inject(ProcessApi);
  readonly #modeler = inject(BpmnModeler);
  readonly #analysis = inject(ImportAnalysis);
  readonly #document = inject(DOCUMENT);

  readonly #status = signal<CompileStatus>('idle');
  readonly #result = signal<CompileResult | null>(null);
  readonly #failure = signal<ApiError | null>(null);
  readonly #downloading = signal(false);
  readonly #downloadFailure = signal<ApiError | null>(null);
  /** Id of the newest compile; older responses are ignored. */
  #latest = 0;
  /** Bumped whenever the diagram changes, so a download failure is not attributed to a newer diagram. */
  #diagramVersion = 0;

  readonly status = this.#status.asReadonly();
  readonly result = this.#result.asReadonly();
  readonly failure = this.#failure.asReadonly();
  readonly downloading = this.#downloading.asReadonly();
  readonly downloadFailure = this.#downloadFailure.asReadonly();
  /** Compile is allowed only for a diagram the backend said it can analyze. */
  readonly canCompile = computed(() => this.#analysis.supported() && this.#status() !== 'loading');
  readonly canDownload = computed(() => this.#analysis.supported() && !this.#downloading());

  constructor() {
    this.#modeler.onEdited(() => this.#discard());
    this.#modeler.onLoad(() => this.#discard());
    effect(() => {
      if (this.#analysis.status() === 'loading') untracked(() => this.#discard());
    });
  }

  /** BPMN id mapped to `symbol` by the current result, whether or not it is on the canvas. */
  bpmnIdOf(symbol: string): string | null {
    const ids = this.#result()?.bpmn_node_ids;
    return ids && Object.hasOwn(ids, symbol) ? ids[symbol] : null;
  }

  /** Compiles the diagram as it is now on the canvas. */
  async compile(): Promise<void> {
    if (!this.canCompile()) return;
    const request = this.#begin();
    this.#status.set('loading');
    try {
      const file = await this.#currentDiagram();
      const result = await firstValueFrom(this.#api.compile(file));
      if (request !== this.#latest || !this.#analysis.supported()) return;
      this.#result.set(result);
      this.#modeler.applyLabels(symbolLabels(result.bpmn_node_ids, (id) => this.#modeler.hasElement(id)), LABEL_GROUP);
      this.#status.set('loaded');
    } catch (thrown) {
      if (request !== this.#latest) return;
      this.#failure.set(asApiError(thrown));
      this.#status.set('failed');
    }
  }

  /** Compiles the diagram as it is now and saves the generated Rails project ZIP. */
  async download(): Promise<void> {
    if (!this.canDownload()) return;
    this.#downloading.set(true);
    this.#downloadFailure.set(null);
    const version = this.#diagramVersion;
    try {
      const archive = await firstValueFrom(this.#api.downloadProject(await this.#currentDiagram()));
      this.#save(archive.blob, archive.fileName);
    } catch (thrown) {
      if (version === this.#diagramVersion) this.#downloadFailure.set(asApiError(thrown));
    } finally {
      this.#downloading.set(false);
    }
  }

  async #currentDiagram(): Promise<File> {
    const xml = await this.#modeler.exportXml();
    return new File([xml], FILE_NAME, { type: 'application/xml' });
  }

  /** Invalidates any request in flight and clears the previous outcome. */
  #begin(): number {
    this.#result.set(null);
    this.#modeler.applyLabels(new Map(), LABEL_GROUP);
    this.#failure.set(null);
    this.#downloadFailure.set(null);
    return ++this.#latest;
  }

  #discard(): void {
    this.#diagramVersion++;
    this.#begin();
    this.#status.set('idle');
  }

  #save(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = this.#document.createElement('a');
    link.href = url;
    link.download = fileName;
    this.#document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url));
  }
}
