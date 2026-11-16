import { Component, computed, inject, input } from '@angular/core';
import { BpmnModeler } from '../../../process-editor/services/bpmn-modeler';
import { toCanvasId } from '../../models/symbol-nodes';
import { CompileAnalysis } from '../../services/compile-analysis';

/**
 * A node symbol with its BPMN id; a button when the element is on the canvas. By default the symbol belongs to the
 * current compile result; pass `nodeIds` (the `bpmn_node_ids` of the response the symbol came from, or null when
 * there is none) for symbols of another response, such as a simulation.
 */
@Component({
  selector: 'app-node-ref',
  template: `
    @if (canvasId(); as id) {
      <button type="button" class="rounded-control border border-border px-1 font-mono hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-focus-ring" [attr.title]="'Mostrar ' + id + ' en el diagrama'" (click)="focus(id)">{{ label() }}</button>
    } @else {
      <span class="font-mono">{{ label() }}</span>
    }
  `,
  host: { class: 'inline-block' },
})
export class NodeRef {
  readonly #compile = inject(CompileAnalysis);
  readonly #modeler = inject(BpmnModeler);

  readonly symbol = input.required<string>();
  /** `undefined` (the default) uses the compile result; `null` means the response had no mapping. */
  readonly nodeIds = input<Readonly<Record<string, string>> | null | undefined>(undefined);

  readonly #ids = computed(() => {
    const given = this.nodeIds();
    return given === undefined ? (this.#compile.result()?.bpmn_node_ids ?? null) : given;
  });

  protected readonly label = computed(() => {
    const ids = this.#ids();
    return ids && Object.hasOwn(ids, this.symbol()) ? `${this.symbol()} · ${ids[this.symbol()]}` : this.symbol();
  });

  protected readonly canvasId = computed(() => toCanvasId(this.symbol(), this.#ids(), (id) => this.#modeler.hasElement(id)));

  protected focus(id: string): void {
    this.#modeler.focusElement(id);
  }
}
