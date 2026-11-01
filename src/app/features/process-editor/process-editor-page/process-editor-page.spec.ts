import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BpmnModeler } from '../services/bpmn-modeler';
import { ProcessEditorPage } from './process-editor-page';

describe('ProcessEditorPage', () => {
  let root: HTMLElement;
  let fixture: ReturnType<typeof TestBed.createComponent<ProcessEditorPage>>;

  const toggle = async (label: string) => {
    const button = [...root.querySelectorAll('header button')].find((b) => b.textContent?.trim() === label);
    (button as HTMLButtonElement).click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessEditorPage],
      providers: [{ provide: BpmnModeler, useValue: { attach: () => {}, destroy: () => {}, selection: signal(null), updateName: () => {} } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessEditorPage);
    root = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('renders the toolbar, the canvas and both panels', () => {
    expect(root.querySelector('app-editor-toolbar')).toBeTruthy();
    expect(root.querySelector('app-bpmn-canvas')).toBeTruthy();
    expect(root.querySelector('app-properties-panel')).toBeTruthy();
    expect(root.querySelector('section[aria-label="Analysis"]')).toBeTruthy();
  });

  it('collapses the properties panel', async () => {
    await toggle('Properties');
    expect(root.querySelector('app-properties-panel')).toBeNull();
  });

  it('collapses the analysis panel', async () => {
    await toggle('Analysis');
    expect(root.querySelector('section[aria-label="Analysis"]')).toBeNull();
  });
});
