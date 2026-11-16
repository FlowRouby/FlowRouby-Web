import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ApiError } from '../../../../core/models/api-error';
import type { CompileResult } from '../../../../core/models/compile-result';
import { LOOP_RESULT, XOR_RESULT } from '../../../../core/testing/compile-fixtures';
import { BpmnModeler } from '../../../process-editor/services/bpmn-modeler';
import { CompileAnalysis, type CompileStatus } from '../../services/compile-analysis';
import { ImportAnalysis, type ImportStatus } from '../../services/import-analysis';
import { AnalysisTabs } from './analysis-tabs';

describe('AnalysisTabs', () => {
  const importStatus = signal<ImportStatus>('loaded');
  const stale = signal(false);
  const supported = signal(true);
  const status = signal<CompileStatus>('idle');
  const result = signal<CompileResult | null>(null);
  const failure = signal<ApiError | null>(null);
  const downloading = signal(false);
  const downloadFailure = signal<ApiError | null>(null);
  const compileApi = {
    status,
    result,
    failure,
    downloading,
    downloadFailure,
    canCompile: signal(true),
    canDownload: signal(true),
    bpmnIdOf: (s: string) => result()?.bpmn_node_ids[s] ?? null,
    compile: vi.fn(),
    download: vi.fn(),
  };
  const modeler = { hasElement: () => true, focusElement: vi.fn() };
  let fixture: ReturnType<typeof TestBed.createComponent<AnalysisTabs>>;
  let root: HTMLElement;

  const buttons = () => [...root.querySelectorAll('button')];
  const named = (label: string) => buttons().find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
  const tabs = () => [...root.querySelectorAll<HTMLElement>('[role="tab"]')];
  const selectedTab = () => tabs().find((t) => t.getAttribute('aria-selected') === 'true')?.textContent?.trim();
  const settle = () => fixture.whenStable();
  const key = async (name: string) => {
    root.querySelector('[role="tablist"]')?.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));
    await settle();
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    importStatus.set('loaded');
    stale.set(false);
    supported.set(true);
    status.set('idle');
    result.set(null);
    failure.set(null);
    downloading.set(false);
    downloadFailure.set(null);
    compileApi.canCompile.set(true);
    compileApi.canDownload.set(true);
    await TestBed.configureTestingModule({
      imports: [AnalysisTabs],
      providers: [
        { provide: ImportAnalysis, useValue: { status: importStatus, stale, supported, diagnostics: signal([]), failure: signal(null), rejected: signal(false), recheck: vi.fn() } },
        { provide: CompileAnalysis, useValue: compileApi },
        { provide: BpmnModeler, useValue: modeler },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AnalysisTabs);
    root = fixture.nativeElement;
    await settle();
  });

  describe('tabs', () => {
    it('exposes an accessible tablist with the diagnostics tab selected first', () => {
      expect(root.querySelector('[role="tablist"]')?.getAttribute('aria-label')).toBeTruthy();
      expect(tabs().map((t) => t.textContent?.trim())).toEqual(['Diagnósticos', 'FlowSpec', 'Análisis formal', 'Ruby']);
      expect(selectedTab()).toBe('Diagnósticos');
      const panel = root.querySelector('[role="tabpanel"]');
      expect(panel?.getAttribute('aria-labelledby')).toBe(tabs()[0].id);
      expect(tabs()[0].getAttribute('aria-controls')).toBe(panel?.id);
      expect(tabs().slice(1).map((t) => t.getAttribute('aria-controls'))).toEqual([null, null, null]);
      for (const tab of tabs()) {
        const controls = tab.getAttribute('aria-controls');
        if (controls) expect(root.querySelector('#' + controls)).toBeTruthy();
      }
      expect(root.querySelector('app-diagnostics-panel')).toBeTruthy();
    });

    it('only the selected tab is in the tab order', () => {
      expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);
    });

    it('switches on click', async () => {
      named('Ruby').click();
      await settle();
      expect(selectedTab()).toBe('Ruby');
      expect(root.querySelector('app-diagnostics-panel')).toBeNull();
    });

    it('moves with the arrow keys, wrapping, and with Home and End, focusing the new tab', async () => {
      const focus = vi.spyOn(tabs()[1], 'focus');
      await key('ArrowRight');
      expect(selectedTab()).toBe('FlowSpec');
      expect(focus).toHaveBeenCalled();
      await key('ArrowLeft');
      await key('ArrowLeft');
      expect(selectedTab()).toBe('Ruby');
      await key('ArrowRight');
      expect(selectedTab()).toBe('Diagnósticos');
      await key('End');
      expect(selectedTab()).toBe('Ruby');
      await key('Home');
      expect(selectedTab()).toBe('Diagnósticos');
    });

    it('ignores other keys', async () => {
      await key('a');
      expect(selectedTab()).toBe('Diagnósticos');
    });

    it('shows each compile view from the result', async () => {
      result.set(XOR_RESULT);
      status.set('loaded');
      named('FlowSpec').click();
      await settle();
      expect(root.querySelector('app-flowspec-view pre')?.textContent).toBe(XOR_RESULT.flowspec.code);

      named('Análisis formal').click();
      await settle();
      expect(root.querySelector('app-formal-analysis-view')?.textContent).toContain('Flujo de trabajo válido');

      named('Ruby').click();
      await settle();
      expect(root.querySelector('app-ruby-view')?.textContent).toContain('Gemfile');
    });

    it('shows the invalid workflow view for the broken fixture', async () => {
      result.set(LOOP_RESULT);
      named('Análisis formal').click();
      await settle();
      expect(root.textContent).toContain('Flujo de trabajo inválido');
    });

    it('asks to compile when there is no result yet', async () => {
      named('Ruby').click();
      await settle();
      expect(root.textContent).toContain('Compile el diagrama');
    });
  });

  describe('actions', () => {
    it('compile opens FlowSpec and starts the compile', async () => {
      named('Compilar').click();
      await settle();
      expect(compileApi.compile).toHaveBeenCalledTimes(1);
      expect(selectedTab()).toBe('FlowSpec');
    });

    it('download starts the download', () => {
      named('Descargar ZIP').click();
      expect(compileApi.download).toHaveBeenCalledTimes(1);
    });

    it('disables both buttons with a reason when the diagram is not supported', async () => {
      supported.set(false);
      importStatus.set('idle');
      compileApi.canCompile.set(false);
      compileApi.canDownload.set(false);
      await settle();

      expect(named('Compilar').disabled).toBe(true);
      expect(named('Descargar ZIP').disabled).toBe(true);
      const reason = root.querySelector('#analysis-actions-reason');
      expect(reason?.textContent).toContain('Verifique el diagrama');
      expect(named('Compilar').getAttribute('aria-describedby')).toBe('analysis-actions-reason');
    });

    it.each<[string, ImportStatus, boolean, string]>([
      ['the diagram changed', 'loaded', true, 'cambió'],
      ['the check is running', 'loading', false, 'Verificando'],
      ['the diagram cannot be analyzed', 'loaded', false, 'no se puede analizar'],
    ])('explains the reason when %s', async (_name, state, isStale, text) => {
      supported.set(false);
      importStatus.set(state);
      stale.set(isStale);
      await settle();
      expect(root.querySelector('#analysis-actions-reason')?.textContent).toContain(text);
    });

    it('shows no reason and enables both buttons when supported', () => {
      expect(root.querySelector('#analysis-actions-reason')).toBeNull();
      expect(named('Compilar').disabled).toBe(false);
      expect(named('Descargar ZIP').disabled).toBe(false);
    });

    it('shows loading labels and disables the buttons while working', async () => {
      status.set('loading');
      downloading.set(true);
      compileApi.canCompile.set(false);
      compileApi.canDownload.set(false);
      await settle();
      expect(named('Compilando…').disabled).toBe(true);
      expect(named('Descargando…').disabled).toBe(true);
    });

    it('shows a Spanish notice when the ZIP download fails', async () => {
      downloadFailure.set({ kind: 'unknown', status: 500 });
      await settle();
      expect(root.querySelector('[role="alert"]')?.textContent).toContain('No se pudo generar el archivo ZIP');
    });
  });

  describe('compile failures', () => {
    const fail = async (error: ApiError) => {
      status.set('failed');
      failure.set(error);
      named('FlowSpec').click();
      await settle();
      return (root.textContent ?? '').replace(/\s+/g, ' ');
    };

    it('translates the diagnostics of a 422 by code', async () => {
      const text = await fail({
        kind: 'diagnostics',
        status: 422,
        message: 'raw',
        diagnostics: [{ severity: 'error', code: 'NO_END_EVENT', message: 'raw backend text', elementId: null, elementType: null, processId: 'P', blocksAnalysis: true, line: null }],
      });
      expect(text).toContain('El proceso no tiene un evento de fin');
      expect(text).not.toContain('raw backend text');
    });

    it('shows line, column and FlowSpec of a syntax error', async () => {
      const text = await fail({ kind: 'message', status: 422, detail: { message: 'Unexpected token', line: 4, column: 7, flowspec_code: 'process "x"\n  bad' } });
      expect(text).toContain('error de sintaxis');
      expect(text).toContain('línea 4');
      expect(text).toContain('columna 7');
      expect(root.querySelector('pre[aria-label="FlowSpec generado"]')?.textContent).toBe('process "x"\n  bad');
      expect(text).not.toContain('Unexpected token');
    });

    it('reuses the connection notice for a network failure', async () => {
      expect(await fail({ kind: 'network', status: 0 })).toContain('No se pudo conectar con el servidor');
    });

    it('does not touch the canvas', async () => {
      await fail({ kind: 'network', status: 0 });
      expect(modeler.focusElement).not.toHaveBeenCalled();
    });
  });
});
