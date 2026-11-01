import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { BpmnModeler } from './features/process-editor/services/bpmn-modeler';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: BpmnModeler, useValue: { attach: () => {}, destroy: () => {} } }],
    }).compileComponents();
  });

  it('should render the toolbar and the canvas', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-editor-toolbar')).toBeTruthy();
    expect(compiled.querySelector('app-bpmn-canvas')).toBeTruthy();
  });
});
