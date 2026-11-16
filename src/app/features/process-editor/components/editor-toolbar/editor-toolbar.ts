import { Component, inject } from '@angular/core';
import { ImportAnalysis } from '../../../process-analysis/services/import-analysis';
import { BpmnModeler } from '../../services/bpmn-modeler';

@Component({
  selector: 'app-editor-toolbar',
  styleUrl: './editor-toolbar.css',
  templateUrl: './editor-toolbar.html',
})
export class EditorToolbar {
  readonly #modeler = inject(BpmnModeler);
  readonly #analysis = inject(ImportAnalysis);

  protected async importFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) return;
    try {
      await this.#modeler.importXml(await file.text());
    } catch {
      // The canvas could not render the file; the backend diagnostics explain what is wrong.
    }
    // Independent of the canvas: a rendering failure must not skip the backend, nor the reverse.
    await this.#analysis.check(file);
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
