import { Component, inject } from '@angular/core';
import { BpmnModeler } from '../../services/bpmn-modeler';

@Component({
  selector: 'app-properties-panel',
  styleUrl: './properties-panel.css',
  templateUrl: './properties-panel.html',
})
export class PropertiesPanel {
  readonly #modeler = inject(BpmnModeler);
  protected readonly element = this.#modeler.selection;

  protected rename(name: string): void {
    this.#modeler.updateName(name);
  }
}
