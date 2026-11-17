import { Component, DestroyRef, ElementRef, afterNextRender, inject } from '@angular/core';
import { BpmnModeler } from '../../services/bpmn-modeler';

/** Hosts the bpmn.io properties panel: fills its container and scrolls, and mounts the panel while it lives. */
@Component({
  selector: 'app-properties-panel',
  host: { class: 'block h-full overflow-y-auto' },
  template: '',
})
export class PropertiesPanel {
  constructor() {
    const modeler = inject(BpmnModeler);
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => modeler.mountPropertiesPanel(host));
    inject(DestroyRef).onDestroy(() => modeler.unmountPropertiesPanel());
  }
}
