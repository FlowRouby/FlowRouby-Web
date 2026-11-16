import { inject, Service } from '@angular/core';
import { ImportAnalysis } from '../../process-analysis/services/import-analysis';
import { BpmnModeler } from './bpmn-modeler';
import { DiagramStorage } from './diagram-storage';

/** How long the diagram must stay unedited before it is saved. */
export const SAVE_DEBOUNCE_MS = 500;
const DEFAULT_FILE_NAME = 'diagram.bpmn';

/**
 * The single owner of "load this XML and analyse it". It renders the XML, remembers it (only the XML and its file
 * name) so a page reload can restore it, and sends it to the backend. It also saves the diagram after edits.
 */
@Service()
export class DiagramLoader {
  readonly #modeler = inject(BpmnModeler);
  readonly #analysis = inject(ImportAnalysis);
  readonly #storage = inject(DiagramStorage);

  #filename = DEFAULT_FILE_NAME;
  #saveTimer: ReturnType<typeof setTimeout> | undefined;
  /** Bumped whenever a pending or in-flight save becomes obsolete (a load or a clear). */
  #generation = 0;

  constructor() {
    this.#modeler.onEdited(() => this.#scheduleSave());
    // A load replaces the diagram, so an edit save still waiting would store the old one.
    this.#modeler.onLoad(() => this.#cancelSave());
  }

  /**
   * Renders the XML, stores it and runs the backend check. Resolves to whether the canvas could render the XML.
   * A rendering failure does not skip the backend, and a backend failure never prevents showing the diagram.
   */
  async load(xml: string, file: File): Promise<boolean> {
    let rendered = true;
    try {
      await this.#modeler.importXml(xml);
    } catch {
      // The canvas could not render the file; the backend diagnostics explain what is wrong.
      rendered = false;
    }
    if (rendered) {
      this.#filename = file.name;
      this.#storage.save({ xml, filename: file.name });
    }
    // Independent of the canvas: a rendering failure must not skip the backend, nor the reverse.
    await this.#analysis.check(file);
    return rendered;
  }

  /**
   * Loads the diagram kept from the previous visit, if any. Call it once, after the canvas is attached. A stored
   * diagram the canvas cannot render is forgotten and the empty diagram stays.
   */
  async restore(): Promise<void> {
    const stored = this.#storage.load();
    if (!stored) return;
    const rendered = await this.load(stored.xml, new File([stored.xml], stored.filename, { type: 'application/xml' }));
    if (rendered) return;
    this.#storage.clear();
    await this.#reset();
  }

  /** Back to the empty diagram, with nothing left to restore. */
  async clear(): Promise<void> {
    this.#storage.clear();
    await this.#reset();
  }

  async #reset(): Promise<void> {
    this.#cancelSave();
    this.#filename = DEFAULT_FILE_NAME;
    await this.#modeler.clear();
  }

  #cancelSave(): void {
    clearTimeout(this.#saveTimer);
    this.#saveTimer = undefined;
    this.#generation++;
  }

  #scheduleSave(): void {
    clearTimeout(this.#saveTimer);
    this.#saveTimer = setTimeout(() => void this.#save(), SAVE_DEBOUNCE_MS);
  }

  async #save(): Promise<void> {
    this.#saveTimer = undefined;
    const generation = this.#generation;
    let xml: string;
    try {
      xml = await this.#modeler.exportXml();
    } catch {
      return;
    }
    // A load or a clear started while exporting: this XML describes the previous diagram.
    if (generation !== this.#generation) return;
    this.#storage.save({ xml, filename: this.#filename });
  }
}
