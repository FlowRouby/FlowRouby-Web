import { Component } from '@angular/core';
import { BpmnCanvas } from './features/process-editor/components/bpmn-canvas/bpmn-canvas';
import { EditorToolbar } from './features/process-editor/components/editor-toolbar/editor-toolbar';

@Component({
  imports: [EditorToolbar, BpmnCanvas],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
