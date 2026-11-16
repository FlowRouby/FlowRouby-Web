import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CompileAnalysis } from '../../process-analysis/services/compile-analysis';
import { ImportAnalysis } from '../../process-analysis/services/import-analysis';
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
      providers: [
        { provide: BpmnModeler, useValue: { attach: () => {}, destroy: () => {}, selection: signal(null), updateName: () => {}, validateId: () => null, updateId: () => null } },
        { provide: CompileAnalysis, useValue: { status: signal('idle'), result: signal(null), failure: signal(null), downloading: signal(false), downloadFailure: signal(null), canCompile: signal(false), canDownload: signal(false), compile: () => {}, download: () => {} } },
        { provide: ImportAnalysis, useValue: { status: signal('idle'), diagnostics: signal([]), failure: signal(null), stale: signal(false), supported: signal(false), rejected: signal(false), recheck: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessEditorPage);
    root = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('renders the toolbar, the canvas and both panels', () => {
    expect(root.querySelector('app-editor-toolbar')).toBeTruthy();
    expect(root.querySelector('app-bpmn-canvas')).toBeTruthy();
    expect(root.querySelector('app-properties-panel')).toBeTruthy();
    expect(root.querySelector('section[aria-label="Análisis"] app-analysis-tabs')).toBeTruthy();
  });

  it('lets the user enlarge and shrink the analysis section', async () => {
    const section = root.querySelector('section[aria-label="Análisis"]') as HTMLElement;
    const toggle = () => section.querySelector('button[aria-pressed]') as HTMLButtonElement;
    expect(section.className).toContain('h-56');

    toggle().click();
    await fixture.whenStable();
    expect(section.className).toContain('h-[60vh]');
    expect(section.className).not.toContain('h-56');
    expect(toggle().textContent?.trim()).toBe('Reducir panel');

    toggle().click();
    await fixture.whenStable();
    expect(section.className).toContain('h-56');
  });

  it('collapses the properties panel', async () => {
    await toggle('Propiedades');
    expect(root.querySelector('app-properties-panel')).toBeNull();
  });

  it('collapses the analysis panel', async () => {
    await toggle('Análisis');
    expect(root.querySelector('section[aria-label="Análisis"]')).toBeNull();
  });
});
