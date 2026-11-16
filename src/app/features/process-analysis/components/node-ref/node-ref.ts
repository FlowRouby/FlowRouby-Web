import { Component, computed, inject, input } from '@angular/core';
import { BpmnModeler } from '../../../process-editor/services/bpmn-modeler';
import { toCanvasId } from '../../models/symbol-nodes';
import { CompileAnalysis } from '../../services/compile-analysis';

/** A node symbol of the current compile result, with its BPMN id; a button when the element is on the canvas. */
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

  protected readonly label = computed(() => {
    const id = this.#compile.bpmnIdOf(this.symbol());
    return id === null ? this.symbol() : `${this.symbol()} · ${id}`;
  });

  protected readonly canvasId = computed(() =>
    toCanvasId(this.symbol(), this.#compile.result()?.bpmn_node_ids ?? null, (id) => this.#modeler.hasElement(id)),
  );

  protected focus(id: string): void {
    this.#modeler.focusElement(id);
  }
}
