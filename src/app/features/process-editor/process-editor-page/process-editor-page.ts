import { Component, signal } from '@angular/core';
import { BpmnCanvas } from '../components/bpmn-canvas/bpmn-canvas';
import { EditorToolbar } from '../components/editor-toolbar/editor-toolbar';
import { PropertiesPanel } from '../components/properties-panel/properties-panel';

@Component({
  imports: [EditorToolbar, BpmnCanvas, PropertiesPanel],
  selector: 'app-process-editor-page',
  styleUrl: './process-editor-page.css',
  templateUrl: './process-editor-page.html',
  host: { class: 'block h-dvh' },
})
export class ProcessEditorPage {
  protected readonly propertiesOpen = signal(true);
  protected readonly analysisOpen = signal(true);
}
