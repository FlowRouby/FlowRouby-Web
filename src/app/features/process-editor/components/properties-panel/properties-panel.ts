import { Component, inject } from '@angular/core';
import { BpmnModeler } from '../../services/bpmn-modeler';

@Component({
  selector: 'app-properties-panel',
  styleUrl: './properties-panel.css',
  templateUrl: './properties-panel.html',
})
export class PropertiesPanel {
  protected readonly element = inject(BpmnModeler).selection;
}
