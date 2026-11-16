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
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const element = this.container().nativeElement;
      void this.#modeler.attach(element);
      // Panels around the canvas can be resized or hidden without the window changing size.
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => this.#modeler.resized());
        observer.observe(element);
        destroyRef.onDestroy(() => observer.disconnect());
      }
    });
    destroyRef.onDestroy(() => this.#modeler.destroy());
  }
}
