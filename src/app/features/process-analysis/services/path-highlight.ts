import { inject, Service, signal } from '@angular/core';
import { BpmnModeler } from '../../process-editor/services/bpmn-modeler';

/** Marker group of the highlighted route, independent from the diagnostics. */
const PATH_GROUP = 'path';

/** Who painted the route that is on the canvas. */
export type PathOwner = 'simulation' | 'trace';

/**
 * Single owner of the route highlight of the canvas. The simulated and the validated routes share one marker group,
 * so showing one replaces the other, and a feature can only remove a route it painted itself.
 */
@Service()
export class PathHighlight {
  readonly #modeler = inject(BpmnModeler);
  readonly #owner = signal<PathOwner | null>(null);

  /** The feature whose route is on the canvas, or null when there is none. */
  readonly owner = this.#owner.asReadonly();

  /** Replaces whatever route is on the canvas. An empty map leaves the canvas without a route and without owner. */
  show(owner: PathOwner, markers: ReadonlyMap<string, string>): void {
    this.#modeler.applyMarkers(markers, PATH_GROUP);
    this.#owner.set(markers.size > 0 ? owner : null);
  }

  /** Removes the route only when `owner` painted it; another feature's route stays. */
  clear(owner: PathOwner): void {
    if (this.#owner() !== owner) return;
    this.#modeler.applyMarkers(new Map(), PATH_GROUP);
    this.#owner.set(null);
  }
}
