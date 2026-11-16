import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { SampleProcess } from '../../../../core/models/sample-process';
import { SampleApi } from '../../../../core/services/sample-api';
import { ImportAnalysis } from '../../../process-analysis/services/import-analysis';
import { BpmnModeler } from '../../services/bpmn-modeler';

type CatalogState = 'loading' | 'ready' | 'failed';

@Component({
  selector: 'app-editor-toolbar',
  styleUrl: './editor-toolbar.css',
  templateUrl: './editor-toolbar.html',
})
export class EditorToolbar {
  readonly #modeler = inject(BpmnModeler);
  readonly #analysis = inject(ImportAnalysis);
  readonly #sampleApi = inject(SampleApi);

  readonly #samples = signal<SampleProcess[]>([]);
  readonly #catalogState = signal<CatalogState>('loading');
  readonly #loadingSample = signal(false);
  readonly #sampleFailed = signal(false);
  /** Identifies the latest load request; a response for an older one is ignored. */
  #loadToken = 0;

  protected readonly samples = this.#samples.asReadonly();
  protected readonly catalogFailed = computed(() => this.#catalogState() === 'failed');
  protected readonly sampleFailed = this.#sampleFailed.asReadonly();
  protected readonly samplesDisabled = computed(
    () => this.#catalogState() !== 'ready' || this.#samples().length === 0 || this.#loadingSample(),
  );

  constructor() {
    void this.loadCatalog();
  }

  protected async loadCatalog(): Promise<void> {
    this.#catalogState.set('loading');
    try {
      this.#samples.set(await firstValueFrom(this.#sampleApi.list()));
      this.#catalogState.set('ready');
    } catch {
      this.#catalogState.set('failed');
    }
  }

  protected async importFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    this.#supersedeSampleLoad();
    await this.#load(await file.text(), file);
    input.value = '';
  }

  protected async loadSample(select: HTMLSelectElement): Promise<void> {
    const sample = this.#samples().find((item) => item.id === select.value);
    if (!sample) return;
    const token = ++this.#loadToken;
    this.#sampleFailed.set(false);
    this.#loadingSample.set(true);
    let xml: string;
    try {
      xml = await firstValueFrom(this.#sampleApi.xml(sample.id));
    } catch {
      if (token !== this.#loadToken) return;
      this.#sampleFailed.set(true);
      this.#loadingSample.set(false);
      select.value = '';
      return;
    }
    if (token !== this.#loadToken) return;
    await this.#load(xml, new File([xml], sample.filename, { type: 'application/xml' }));
    if (token !== this.#loadToken) return;
    this.#loadingSample.set(false);
    select.value = '';
  }

  protected async exportFile(): Promise<void> {
    const xml = await this.#modeler.exportXml();
    const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'diagram.bpmn';
    link.click();
    URL.revokeObjectURL(url);
  }

  protected zoomIn(): void {
    this.#modeler.zoomIn();
  }

  protected zoomOut(): void {
    this.#modeler.zoomOut();
  }

  protected zoomFit(): void {
    this.#modeler.zoomFit();
  }

  /** Renders the XML on the canvas and sends the same content to the backend for analysis. */
  async #load(xml: string, file: File): Promise<void> {
    try {
      await this.#modeler.importXml(xml);
    } catch {
      // The canvas could not render the file; the backend diagnostics explain what is wrong.
    }
    // Independent of the canvas: a rendering failure must not skip the backend, nor the reverse.
    await this.#analysis.check(file);
  }

  /** A new import makes any sample still in flight obsolete. */
  #supersedeSampleLoad(): void {
    this.#loadToken++;
    this.#loadingSample.set(false);
    this.#sampleFailed.set(false);
  }
}
