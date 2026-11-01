import { Component, inject } from '@angular/core';
import { BpmnModeler } from '../../services/bpmn-modeler';

@Component({
  selector: 'app-editor-toolbar',
  styleUrl: './editor-toolbar.css',
  templateUrl: './editor-toolbar.html',
})
export class EditorToolbar {
  readonly #modeler = inject(BpmnModeler);

  protected async importFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    await this.#modeler.importXml(await file.text());
    input.value = '';
  }

  protected async exportFile(): Promise<void> {
    const xml = await this.#modeler.exportXml();
    const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'diagram.bpmn';
    link.click();
    URL.revokeObjectURL(url);
  }

  protected zoomIn(): void {
    this.#modeler.zoomIn();
  }

  protected zoomOut(): void {
    this.#modeler.zoomOut();
  }

  protected zoomFit(): void {
    this.#modeler.zoomFit();
  }
}
