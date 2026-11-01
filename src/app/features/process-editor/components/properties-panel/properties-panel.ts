import { Component, inject, linkedSignal } from '@angular/core';
import { BpmnModeler } from '../../services/bpmn-modeler';

@Component({
  selector: 'app-properties-panel',
  styleUrl: './properties-panel.css',
  templateUrl: './properties-panel.html',
})
export class PropertiesPanel {
  readonly #modeler = inject(BpmnModeler);
  protected readonly element = this.#modeler.selection;

  /** Cleared every time the selection changes. */
  protected readonly idError = linkedSignal<unknown, string | null>({
    source: this.element,
    computation: () => null,
  });

  protected rename(name: string): void {
    this.#modeler.updateName(name);
  }

  protected checkId(id: string): void {
    this.idError.set(this.#modeler.validateId(id));
  }

  protected changeId(id: string): void {
    this.idError.set(this.#modeler.updateId(id));
  }
}
