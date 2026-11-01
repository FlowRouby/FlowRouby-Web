import { Service } from '@angular/core';
import Modeler from 'bpmn-js/lib/Modeler';

const ZOOM_FACTOR = 1.2;

interface Canvas {
  zoom(): number;
  zoom(level: number | 'fit-viewport', center?: 'auto'): number;
}

@Service()
export class BpmnModeler {
  #modeler?: Modeler;

  async attach(container: HTMLElement): Promise<void> {
    this.#modeler = new Modeler({ container });
    await this.#modeler.createDiagram();
    this.zoomFit();
  }

  destroy(): void {
    this.#modeler?.destroy();
    this.#modeler = undefined;
  }

  async importXml(xml: string): Promise<void> {
    await this.#modeler?.importXML(xml);
    this.zoomFit();
  }

  async exportXml(): Promise<string> {
    const result = await this.#modeler?.saveXML({ format: true });
    return result?.xml ?? '';
  }

  zoomIn(): void {
    this.#zoomBy(ZOOM_FACTOR);
  }

  zoomOut(): void {
    this.#zoomBy(1 / ZOOM_FACTOR);
  }

  zoomFit(): void {
    this.#canvas?.zoom('fit-viewport', 'auto');
  }

  get #canvas(): Canvas | undefined {
    return this.#modeler?.get<Canvas>('canvas');
  }

  #zoomBy(factor: number): void {
    const canvas = this.#canvas;
    canvas?.zoom(canvas.zoom() * factor);
  }
}
