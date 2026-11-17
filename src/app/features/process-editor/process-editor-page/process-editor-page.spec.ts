import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CompileAnalysis } from '../../process-analysis/services/compile-analysis';
import { ImportAnalysis } from '../../process-analysis/services/import-analysis';
import { BpmnModeler } from '../services/bpmn-modeler';
import { DiagramLoader } from '../services/diagram-loader';
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
        { provide: BpmnModeler, useValue: { attach: () => {}, destroy: () => {}, mountPropertiesPanel: () => {}, unmountPropertiesPanel: () => {} } },
        { provide: DiagramLoader, useValue: { load: async () => true, restore: async () => {}, clear: async () => {} } },
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

  describe('analysis section size', () => {
    const section = () => root.querySelector('section[aria-label="Análisis"]') as HTMLElement;
    const sizeToggle = () => section().querySelector('button[aria-pressed]') as HTMLButtonElement;
    const handle = () => section().querySelector('[role="separator"]') as HTMLElement;
    const height = () => parseInt(section().style.height, 10);
    const pointer = (type: string, clientY: number) => {
      // The test DOM has no PointerEvent constructor; a MouseEvent carries the same coordinates.
      handle().dispatchEvent(new MouseEvent(type, { clientY, bubbles: true, cancelable: true }));
    };

    it('lets the user enlarge and shrink the section with the button', async () => {
      expect(height()).toBe(224);

      sizeToggle().click();
      await fixture.whenStable();
      expect(height()).toBe(Math.round(window.innerHeight * 0.6));
      expect(sizeToggle().textContent?.trim()).toBe('Reducir panel');

      sizeToggle().click();
      await fixture.whenStable();
      expect(height()).toBe(224);
      expect(sizeToggle().textContent?.trim()).toBe('Ampliar panel');
    });

    it('resizes the section by dragging its top edge and stops when the pointer is released', async () => {
      pointer('pointerdown', 500);
      pointer('pointermove', 420);
      await fixture.whenStable();
      expect(height()).toBe(304);

      pointer('pointerup', 420);
      pointer('pointermove', 100);
      await fixture.whenStable();
      expect(height()).toBe(304);
    });

    it('keeps the dragged height between the minimum and the maximum', async () => {
      pointer('pointerdown', 500);
      pointer('pointermove', 5000);
      await fixture.whenStable();
      expect(height()).toBe(120);

      pointer('pointermove', -5000);
      await fixture.whenStable();
      expect(height()).toBe(Math.round(window.innerHeight * 0.8));
    });

    it('resizes with the keyboard and exposes the value on the separator', async () => {
      handle().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      await fixture.whenStable();
      expect(height()).toBe(248);
      expect(handle().getAttribute('aria-valuenow')).toBe('248');

      handle().dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      await fixture.whenStable();
      expect(height()).toBe(120);
    });

    it('shrinks back to the default size with the button after a drag made it larger', async () => {
      pointer('pointerdown', 500);
      pointer('pointermove', 400);
      await fixture.whenStable();

      sizeToggle().click();
      await fixture.whenStable();
      expect(height()).toBe(224);
    });
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
