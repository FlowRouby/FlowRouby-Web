import { Component, computed, input } from '@angular/core';
import type { Dfa, LoopFinding } from '../../../../core/models/compile-result';
import { type DiagramLoop, dfaDiagram } from '../../models/dfa-diagram';

let nextId = 0;

/** The DFA as a state diagram: entry arrow on the start state, double circle on accept states, labelled arrows. */
@Component({
  selector: 'app-dfa-diagram',
  templateUrl: './dfa-diagram.html',
  host: { class: 'block' },
})
export class DfaDiagram {
  readonly dfa = input.required<Dfa>();
  readonly loops = input<readonly LoopFinding[]>([]);

  /** Marker ids are document-wide, so each instance gets its own. */
  readonly #id = `dfa-arrow-${nextId++}`;

  protected readonly layout = computed(() => dfaDiagram(this.dfa(), this.loops()));
  protected readonly hasLoop = computed(() => this.layout().nodes.some((node) => node.loop !== null));

  protected markerRef(loop: DiagramLoop): string {
    return `url(#${this.#id}-${loop ?? 'plain'})`;
  }

  protected markerId(loop: DiagramLoop | 'plain'): string {
    return `${this.#id}-${loop ?? 'plain'}`;
  }

  /** Loops use a distinct colour and a thicker stroke, so they stand out without relying on colour. */
  protected strokeClass(loop: DiagramLoop): string {
    switch (loop) {
      case 'infinite':
        return 'stroke-danger';
      case 'valid':
        return 'stroke-primary';
      default:
        return 'stroke-content';
    }
  }

  protected fillClass(loop: DiagramLoop | 'plain'): string {
    switch (loop) {
      case 'infinite':
        return 'fill-danger';
      case 'valid':
        return 'fill-primary';
      default:
        return 'fill-content';
    }
  }

  protected strokeWidth(loop: DiagramLoop): number {
    return loop === null ? 1.5 : 3;
  }
}
