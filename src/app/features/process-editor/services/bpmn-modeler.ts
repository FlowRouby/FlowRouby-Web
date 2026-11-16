import { Service, signal } from '@angular/core';
import Modeler from 'bpmn-js/lib/Modeler';
import { validateElementId } from '../models/element-id';
import type { SelectedElement } from '../models/selected-element';

const ZOOM_FACTOR = 1.2;
export const FOCUS_MARKER = 'fr-focus';

interface Canvas {
  zoom(): number;
  zoom(level: number | 'fit-viewport', center?: 'auto'): number;
  addMarker(element: string, marker: string): void;
  removeMarker(element: string, marker: string): void;
  scrollToElement(element: BpmnElement): void;
}

interface ElementRegistry {
  get(id: string): BpmnElement | undefined;
}

interface BpmnElement {
  id: string;
  type: string;
  businessObject: { name?: string };
}

interface Selection {
  get(): BpmnElement[];
  select(element: BpmnElement): void;
}

interface Modeling {
  updateProperties(element: BpmnElement, properties: { id?: string; name?: string }): void;
}

interface Moddle {
  ids: { assigned(id: string): unknown };
}

@Service()
export class BpmnModeler {
  #modeler?: Modeler;
  /** True while a whole diagram is being loaded, so that loading is not reported as a user edit. */
  #loading = false;
  readonly #editListeners = new Set<() => void>();
  readonly #loadListeners = new Set<() => void>();
  /** Markers this service added, so they can be removed without scanning the canvas. */
  #markers = new Map<string, string>();
  #focused?: string;
  readonly #selection = signal<SelectedElement | null>(null);

  /** The single selected element, or null when nothing or several elements are selected. */
  readonly selection = this.#selection.asReadonly();

  async attach(container: HTMLElement): Promise<void> {
    this.#modeler = new Modeler({ container });
    this.#modeler.on(['selection.changed', 'elements.changed'], () => this.#syncSelection());
    this.#modeler.on('commandStack.changed', () => {
      if (!this.#loading) this.#editListeners.forEach((listener) => listener());
    });
    await this.#loadDiagram(() => this.#modeler!.createDiagram());
    this.zoomFit();
  }

  destroy(): void {
    this.#modeler?.destroy();
    this.#modeler = undefined;
    this.#selection.set(null);
  }

  async importXml(xml: string): Promise<void> {
    await this.#loadDiagram(() => this.#modeler?.importXML(xml));
    this.#syncSelection();
    this.zoomFit();
  }

  async exportXml(): Promise<string> {
    const result = await this.#modeler?.saveXML({ format: true });
    return result?.xml ?? '';
  }

  /** Renames the selected element through the command stack, so undo and redo keep working. */
  updateName(name: string): void {
    const element = this.#selectedElement();
    if (!element) return;
    this.#modeler?.get<Modeling>('modeling').updateProperties(element, { name: name || undefined });
  }

  /** Why `id` cannot be applied to the selected element, or null when it can. */
  validateId(id: string): string | null {
    const current = this.#selectedElement()?.id;
    return validateElementId(id, (candidate) => candidate !== current && this.#isIdTaken(candidate));
  }

  /** Applies a new id to the selected element if valid; otherwise changes nothing and returns the reason. */
  updateId(id: string): string | null {
    const element = this.#selectedElement();
    const error = this.validateId(id);
    if (!element || error) return error;
    if (id !== element.id) {
      this.#modeler?.get<Modeling>('modeling').updateProperties(element, { id });
    }
    return null;
  }

  /** Calls `listener` whenever the user edits the diagram. Loading a diagram does not count as an edit. */
  onEdited(listener: () => void): void {
    this.#editListeners.add(listener);
  }

  /**
   * Calls `listener` synchronously when a diagram load starts (a file import or a canvas attach), before the
   * old diagram is replaced, so consumers can drop anything that describes the previous diagram.
   */
  onLoad(listener: () => void): void {
    this.#loadListeners.add(listener);
  }

  hasElement(id: string): boolean {
    return this.#element(id) !== undefined;
  }

  /** Replaces the markers set by the previous call. Ids missing from the canvas are skipped. */
  applyMarkers(markers: ReadonlyMap<string, string>): void {
    for (const [id, marker] of this.#markers) this.#removeMarker(id, marker);
    this.#markers = new Map();
    for (const [id, marker] of markers) {
      if (!this.hasElement(id)) continue;
      this.#canvas?.addMarker(id, marker);
      this.#markers.set(id, marker);
    }
  }

  /** Marks, selects and scrolls to the element. Returns false, touching nothing, when it is not on the canvas. */
  focusElement(id: string): boolean {
    const element = this.#element(id);
    if (!element) return false;
    this.#clearFocus();
    this.#canvas?.addMarker(id, FOCUS_MARKER);
    this.#focused = id;
    this.#modeler?.get<Selection>('selection').select(element);
    this.#canvas?.scrollToElement(element);
    return true;
  }

  zoomIn(): void {
    this.#zoomBy(ZOOM_FACTOR);
  }

  zoomOut(): void {
    this.#zoomBy(1 / ZOOM_FACTOR);
  }

  zoomFit(): void {
    this.#canvas?.zoom('fit-viewport', 'auto');
  }

  get #canvas(): Canvas | undefined {
    return this.#modeler?.get<Canvas>('canvas');
  }

  /** Runs a load, hiding its command stack reset from edit listeners and dropping markers of the old diagram. */
  async #loadDiagram(load: () => Promise<unknown> | undefined): Promise<void> {
    this.#loading = true;
    this.#loadListeners.forEach((listener) => listener());
    try {
      await load();
    } finally {
      this.#loading = false;
      this.#markers = new Map();
      this.#focused = undefined;
    }
  }

  #element(id: string): BpmnElement | undefined {
    return this.#modeler?.get<ElementRegistry>('elementRegistry').get(id);
  }

  #removeMarker(id: string, marker: string): void {
    if (this.hasElement(id)) this.#canvas?.removeMarker(id, marker);
  }

  #clearFocus(): void {
    if (this.#focused !== undefined) this.#removeMarker(this.#focused, FOCUS_MARKER);
    this.#focused = undefined;
  }

  #zoomBy(factor: number): void {
    const canvas = this.#canvas;
    canvas?.zoom(canvas.zoom() * factor);
  }

  #isIdTaken(id: string): boolean {
    return Boolean(this.#modeler?.get<Moddle>('moddle').ids.assigned(id));
  }

  #selectedElement(): BpmnElement | undefined {
    const selected = this.#modeler?.get<Selection>('selection').get() ?? [];
    return selected.length === 1 ? selected[0] : undefined;
  }

  #syncSelection(): void {
    const element = this.#selectedElement();
    this.#selection.set(
      element ? { id: element.id, type: element.type, name: element.businessObject.name } : null,
    );
  }
}
