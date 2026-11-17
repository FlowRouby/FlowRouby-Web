import { inject, InjectionToken, Service } from '@angular/core';
import Modeler from 'bpmn-js/lib/Modeler';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule, CamundaPlatformPropertiesProviderModule } from 'bpmn-js-properties-panel';
import CamundaBehaviorsModule from 'camunda-bpmn-js-behaviors/lib/camunda-platform';
import camundaModdle from 'camunda-bpmn-moddle/resources/camunda.json';

const ZOOM_FACTOR = 1.2;
export const FOCUS_MARKER = 'fr-focus';
/** Marker group used when the caller does not name one (the diagnostics). */
export const DEFAULT_MARKER_GROUP = 'diagnostics';
/** Overlay group used when the caller does not name one. */
export const DEFAULT_LABEL_GROUP = 'labels';
/** Global class of the label pill (see `styles.css`): the overlay HTML lives outside Angular. */
export const LABEL_CLASS = 'fr-symbol-label';
/** Offset that puts a label just above the top-left corner of its element, clear of the element's own name. */
const LABEL_POSITION = { top: -16, left: 0 };

interface Canvas {
  zoom(): number;
  zoom(level: number | 'fit-viewport', center?: 'auto'): number;
  resized(): void;
  addMarker(element: BpmnElement, marker: string): void;
  removeMarker(element: BpmnElement, marker: string): void;
}

interface ElementRegistry {
  get(id: string): BpmnElement | undefined;
}

interface BpmnElement {
  id: string;
  type: string;
  /** Connections leaving a shape (absent on connections). */
  outgoing?: { id: string; target?: { id: string } }[];
}

interface Overlays {
  add(element: BpmnElement | string, type: string, overlay: { position: { top: number; left: number }; html: HTMLElement }): string;
  remove(id: string): void;
}

interface Selection {
  select(element: BpmnElement): void;
}

interface PropertiesPanelService {
  attachTo(container: HTMLElement): void;
  detach(): void;
}

/**
 * Creates the bpmn-js modeler with the official properties panel and its Camunda 7 provider. The panel has no parent
 * here: it is mounted later through `BpmnModeler.mountPropertiesPanel`, because its host element comes and goes.
 * A token, so tests can replace bpmn-js without relying on module mocking.
 */
export const BPMN_MODELER_FACTORY = new InjectionToken<(container: HTMLElement) => Modeler>(
  'BPMN_MODELER_FACTORY',
  {
    factory: () => (container) =>
      new Modeler({
        container,
        additionalModules: [
          BpmnPropertiesPanelModule,
          BpmnPropertiesProviderModule,
          CamundaPlatformPropertiesProviderModule,
          CamundaBehaviorsModule,
        ],
        moddleExtensions: { camunda: camundaModdle },
      }),
  },
);

@Service()
export class BpmnModeler {
  readonly #createModeler = inject(BPMN_MODELER_FACTORY);
  #modeler?: Modeler;
  /** True while a whole diagram is being loaded, so that loading is not reported as a user edit. */
  #loading = false;
  readonly #editListeners = new Set<() => void>();
  readonly #loadListeners = new Set<() => void>();
  /** Markers this service added per group, so they can be removed without scanning the canvas. */
  #markers = new Map<string, Map<BpmnElement, string>>();
  /** Ids of the overlays this service added per group; bpmn-js drops the overlays themselves when a diagram loads. */
  #labels = new Map<string, string[]>();
  #focused?: BpmnElement;
  /** Where the properties panel should be shown; kept so it mounts as soon as the modeler exists. */
  #panelHost?: HTMLElement;

  async attach(container: HTMLElement): Promise<void> {
    this.#modeler = this.#createModeler(container);
    if (this.#panelHost) this.#panel?.attachTo(this.#panelHost);
    this.#modeler.on('commandStack.changed', () => {
      if (!this.#loading) this.#editListeners.forEach((listener) => listener());
    });
    await this.#loadDiagram(() => this.#modeler!.createDiagram());
    this.zoomFit();
  }

  destroy(): void {
    this.#modeler?.destroy();
    this.#modeler = undefined;
  }

  /** Shows the properties panel inside `host`. Before the modeler exists it mounts as soon as it does. */
  mountPropertiesPanel(host: HTMLElement): void {
    this.#panelHost = host;
    this.#panel?.attachTo(host);
  }

  /** Removes the properties panel from the page, whether or not the modeler still exists. */
  unmountPropertiesPanel(): void {
    this.#panelHost = undefined;
    this.#panel?.detach();
  }

  async importXml(xml: string): Promise<void> {
    await this.#loadDiagram(() => this.#modeler?.importXML(xml));
    this.zoomFit();
  }

  /** Replaces the diagram with the empty one through the normal load path, so load listeners run. */
  async clear(): Promise<void> {
    await this.#loadDiagram(() => this.#modeler?.createDiagram());
    this.zoomFit();
  }

  async exportXml(): Promise<string> {
    const result = await this.#modeler?.saveXML({ format: true });
    return result?.xml ?? '';
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

  /**
   * Replaces the markers of `group` (the previous call for that group). Other groups are left untouched, so
   * independent features can mark the canvas without clobbering each other. Ids missing from the canvas are skipped.
   */
  applyMarkers(markers: ReadonlyMap<string, string>, group: string = DEFAULT_MARKER_GROUP): void {
    for (const [element, marker] of this.#markers.get(group) ?? []) this.#canvas?.removeMarker(element, marker);
    const applied = new Map<BpmnElement, string>();
    for (const [id, marker] of markers) {
      const element = this.#element(id);
      if (!element) continue;
      this.#canvas?.addMarker(element, marker);
      applied.set(element, marker);
    }
    this.#markers.set(group, applied);
  }

  /**
   * Replaces the text labels of `group` (the previous call for that group) with one small pill per entry, shown just
   * above the element's top-left corner. Other groups are left untouched, an empty map clears the group, and ids
   * missing from the canvas are skipped. The pills ignore pointer events, so the element under them stays usable.
   */
  applyLabels(labels: ReadonlyMap<string, string>, group: string = DEFAULT_LABEL_GROUP): void {
    const overlays = this.#overlays;
    for (const id of this.#labels.get(group) ?? []) overlays?.remove(id);
    const added: string[] = [];
    for (const [elementId, text] of labels) {
      const element = this.#element(elementId);
      if (!element || !overlays) continue;
      const html = document.createElement('div');
      html.className = LABEL_CLASS;
      html.textContent = text;
      added.push(overlays.add(element, group, { position: LABEL_POSITION, html }));
    }
    this.#labels.set(group, added);
  }

  /** Id of a connection going from `sourceId` to `targetId`, or null when there is none (or an id is unknown). */
  connectionBetween(sourceId: string, targetId: string): string | null {
    const outgoing = this.#element(sourceId)?.outgoing ?? [];
    return outgoing.find((connection) => connection.target?.id === targetId)?.id ?? null;
  }

  /**
   * Marks and selects the element without moving the viewport, so the diagram stays where the user left it.
   * Returns false, touching nothing, when it is not on the canvas.
   */
  focusElement(id: string): boolean {
    const element = this.#element(id);
    if (!element) return false;
    this.#clearFocus();
    this.#canvas?.addMarker(element, FOCUS_MARKER);
    this.#focused = element;
    this.#modeler?.get<Selection>('selection').select(element);
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

  /** Tells bpmn-js its container changed size; by itself it only notices window resizes. */
  resized(): void {
    this.#canvas?.resized();
  }

  get #panel(): PropertiesPanelService | undefined {
    return this.#modeler?.get<PropertiesPanelService>('propertiesPanel');
  }

  get #canvas(): Canvas | undefined {
    return this.#modeler?.get<Canvas>('canvas');
  }

  get #overlays(): Overlays | undefined {
    return this.#modeler?.get<Overlays>('overlays');
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
      this.#labels = new Map();
      this.#focused = undefined;
    }
  }

  #element(id: string): BpmnElement | undefined {
    return this.#modeler?.get<ElementRegistry>('elementRegistry').get(id);
  }

  #clearFocus(): void {
    if (this.#focused !== undefined) this.#canvas?.removeMarker(this.#focused, FOCUS_MARKER);
    this.#focused = undefined;
  }

  #zoomBy(factor: number): void {
    const canvas = this.#canvas;
    canvas?.zoom(canvas.zoom() * factor);
  }
}
