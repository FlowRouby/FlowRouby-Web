import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ApiError } from '../../../../core/models/api-error';
import type { Diagnostic } from '../../../../core/models/diagnostic';
import { BpmnModeler } from '../../../process-editor/services/bpmn-modeler';
import { ImportAnalysis, type ImportStatus } from '../../services/import-analysis';
import { DiagnosticsPanel } from './diagnostics-panel';

const make = (overrides: Partial<Diagnostic>): Diagnostic => ({
  severity: 'warning',
  code: 'DISCONNECTED_NODE',
  message: 'Raw backend text',
  elementId: null,
  elementType: null,
  processId: null,
  blocksAnalysis: false,
  line: null,
  ...overrides,
});

describe('DiagnosticsPanel', () => {
  const status = signal<ImportStatus>('loaded');
  const diagnostics = signal<Diagnostic[]>([]);
  const failure = signal<ApiError | null>(null);
  const stale = signal(false);
  const supported = signal(true);
  const rejected = signal(false);
  const analysis = { status, diagnostics, failure, stale, supported, rejected, recheck: vi.fn() };
  const onCanvas = new Set(['Task_1']);
  const modeler = { hasElement: vi.fn((id: string) => onCanvas.has(id)), focusElement: vi.fn() };

  const render = async () => {
    const fixture = TestBed.createComponent(DiagnosticsPanel);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return { fixture, root, text: () => root.textContent ?? '' };
  };

  beforeEach(async () => {
    status.set('loaded');
    diagnostics.set([]);
    failure.set(null);
    stale.set(false);
    supported.set(true);
    rejected.set(false);
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [DiagnosticsPanel],
      providers: [
        { provide: ImportAnalysis, useValue: analysis },
        { provide: BpmnModeler, useValue: modeler },
      ],
    }).compileComponents();
  });

  it('shows the empty state before anything is loaded', async () => {
    status.set('idle');
    expect((await render()).text()).toContain('Aún no se ha cargado');
  });

  it('shows the empty state for a load without diagnostics', async () => {
    expect((await render()).text()).toContain('sin diagnósticos');
  });

  it('shows a short Spanish notice, not backend text, for a failure without diagnostics', async () => {
    status.set('failed');
    failure.set({ kind: 'network', status: 0 });
    expect((await render()).text()).toContain('No se pudo conectar con el servidor');
  });

  it('lists errors first, then warnings, and keeps info collapsed behind a counter', async () => {
    diagnostics.set([
      make({ severity: 'info', code: 'IGNORED_ELEMENT' }),
      make({ severity: 'warning', code: 'DISCONNECTED_NODE' }),
      make({ severity: 'error', code: 'NO_END_EVENT' }),
    ]);
    const { root, fixture, text } = await render();

    const items = [...root.querySelectorAll('ul[aria-label="Diagnósticos"] > li')].map((li) => li.textContent);
    expect(items).toHaveLength(2);
    expect(items[0]).toContain('Error');
    expect(items[0]).toContain('evento de fin');
    expect(items[1]).toContain('Advertencia');
    expect(text()).toContain('Información: 1');
    expect(root.querySelector('#diagnostics-info')).toBeNull();

    const toggle = root.querySelector<HTMLButtonElement>('[aria-controls="diagnostics-info"]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await fixture.whenStable();
    expect(root.querySelector('#diagnostics-info')?.textContent).toContain('Elemento no relevante');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('shows the line only when it is not null, and the element id and type when present', async () => {
    diagnostics.set([
      make({ elementId: 'Task_1', elementType: 'userTask', line: 5 }),
      make({ code: 'NO_PROCESS', line: null }),
    ]);
    const items = [...(await render()).root.querySelectorAll('ul > li')].map((li) => li.textContent);

    expect(items[0]).toContain('línea 5');
    expect(items[0]).toContain('userTask');
    expect(items[0]).toContain('Task_1');
    expect(items[1]).not.toContain('línea');
  });

  it('marks a diagnostic that blocks the analysis', async () => {
    diagnostics.set([make({ blocksAnalysis: true, code: 'UNSUPPORTED_ELEMENT' }), make({})]);
    const items = [...(await render()).root.querySelectorAll('ul > li')].map((li) => li.textContent);

    expect(items[0]).toContain('Análisis bloqueado');
    expect(items[1]).not.toContain('Análisis bloqueado');
  });

  it('uses the Spanish message as primary text and the backend message only as a title', async () => {
    diagnostics.set([make({ code: 'NO_PROCESS' })]);
    const { root, text } = await render();

    expect(text()).toContain('no contiene ningún proceso');
    expect(text()).not.toContain('Raw backend text');
    expect(root.querySelector('ul > li > *')?.getAttribute('title')).toBe('Raw backend text');
  });

  it('focuses the element when its item is clicked', async () => {
    diagnostics.set([make({ elementId: 'Task_1' })]);
    const { root } = await render();
    root.querySelector<HTMLButtonElement>('ul > li > button')!.click();

    expect(modeler.focusElement).toHaveBeenCalledWith('Task_1');
  });

  it('renders items without an element, or whose element is not on the canvas, as plain text', async () => {
    diagnostics.set([make({ elementId: null }), make({ elementId: 'Missing' })]);
    const { root } = await render();

    expect(root.querySelectorAll('ul > li')).toHaveLength(2);
    expect(root.querySelector('ul button')).toBeNull();
    expect(modeler.hasElement).toHaveBeenCalledWith('Missing');
  });

  it('says the diagram is shown but cannot be analyzed when supported is false after a 200', async () => {
    supported.set(false);
    diagnostics.set([make({ blocksAnalysis: true })]);
    expect((await render()).text()).toContain('se muestra, pero todavía no se puede analizar');
  });

  it('says the diagram could not be imported when the backend rejected it', async () => {
    supported.set(false);
    rejected.set(true);
    diagnostics.set([make({ severity: 'error', code: 'NO_END_EVENT' })]);
    const { text } = await render();

    expect(text()).toContain('No se pudo importar el diagrama');
    expect(text()).not.toContain('todavía no se puede analizar');
  });

  it('shows the stale notice with a re-check button', async () => {
    stale.set(true);
    supported.set(false);
    const { root, text } = await render();

    expect(text()).toContain('cambió después del último análisis');
    expect(text()).not.toContain('todavía no se puede analizar');
    root.querySelector<HTMLButtonElement>('[role="status"] button')!.click();
    expect(analysis.recheck).toHaveBeenCalled();
  });
});
