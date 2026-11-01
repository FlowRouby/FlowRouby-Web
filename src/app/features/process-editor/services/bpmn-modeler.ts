import { Service, signal } from '@angular/core';
import Modeler from 'bpmn-js/lib/Modeler';
import { validateElementId } from '../models/element-id';
import type { SelectedElement } from '../models/selected-element';

const ZOOM_FACTOR = 1.2;

interface Canvas {
  zoom(): number;
  zoom(level: number | 'fit-viewport', center?: 'auto'): number;
}

interface BpmnElement {
  id: string;
  type: string;
  businessObject: { name?: string };
}

interface Selection {
  get(): BpmnElement[];
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
  readonly #selection = signal<SelectedElement | null>(null);

  /** The single selected element, or null when nothing or several elements are selected. */
  readonly selection = this.#selection.asReadonly();

  async attach(container: HTMLElement): Promise<void> {
    this.#modeler = new Modeler({ container });
    this.#modeler.on(['selection.changed', 'elements.changed'], () => this.#syncSelection());
    await this.#modeler.createDiagram();
    this.zoomFit();
  }

  destroy(): void {
    this.#modeler?.destroy();
    this.#modeler = undefined;
    this.#selection.set(null);
  }

  async importXml(xml: string): Promise<void> {
    await this.#modeler?.importXML(xml);
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
