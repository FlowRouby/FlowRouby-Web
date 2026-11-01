import { afterNextRender, Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import { BpmnModeler } from '../../services/bpmn-modeler';

@Component({
  selector: 'app-bpmn-canvas',
  styleUrl: './bpmn-canvas.css',
  templateUrl: './bpmn-canvas.html',
  host: { class: 'block h-full' },
})
export class BpmnCanvas {
  readonly #modeler = inject(BpmnModeler);
  private readonly container = viewChild.required<ElementRef<HTMLElement>>('container');

  constructor() {
    afterNextRender(() => this.#modeler.attach(this.container().nativeElement));
    inject(DestroyRef).onDestroy(() => this.#modeler.destroy());
  }
}
