import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import type { ApiError } from '../../../core/models/api-error';
import type { TraceValidationResult } from '../../../core/models/trace-validation-result';
import { ProcessApi } from '../../../core/services/process-api';
import { TRACE_ACCEPTED, TRACE_NO_TRANSITION } from '../../../core/testing/trace-validation-fixtures';
import { BpmnModeler } from '../../process-editor/services/bpmn-modeler';
import { ImportAnalysis, type ImportStatus } from './import-analysis';
import { PathHighlight } from './path-highlight';
import { TraceValidation } from './trace-validation';

describe('TraceValidation', () => {
  let edited: () => void;
  let loadStarted: () => void;
  const importStatus = signal<ImportStatus>('loaded');
  const supported = signal(true);
  const flows: Record<string, string> = {
    'Start>Review': 'f1',
    'Review>Decide': 'f2',
    'Decide>Notify': 'f3',
    'Notify>EndOk': 'f5',
  };
  const modeler = {
    onEdited: vi.fn(),
    onLoad: vi.fn(),
    exportXml: vi.fn(),
    applyMarkers: vi.fn(),
    hasElement: vi.fn(),
    connectionBetween: vi.fn(),
  };
  const api = { validateTrace: vi.fn() };
  let validation: TraceValidation;

  const flush = () => new Promise((resolve) => setTimeout(resolve));
  const pathCalls = () => modeler.applyMarkers.mock.calls.filter(([, group]) => group === 'path');
  /** The route left on the canvas by the last call; no call means this feature never painted one. */
  const lastPath = () => (pathCalls().at(-1)?.[0] ?? new Map()) as Map<string, string>;

  beforeEach(() => {
    vi.resetAllMocks();
    importStatus.set('loaded');
    supported.set(true);
    modeler.onEdited.mockImplementation((listener: () => void) => (edited = listener));
    modeler.onLoad.mockImplementation((listener: () => void) => (loadStarted = listener));
    modeler.exportXml.mockResolvedValue('<definitions/>');
    modeler.hasElement.mockReturnValue(true);
    modeler.connectionBetween.mockImplementation((a: string, b: string) => flows[`${a}>${b}`] ?? null);
    TestBed.configureTestingModule({
      providers: [
        { provide: BpmnModeler, useValue: modeler },
        { provide: ProcessApi, useValue: api },
        { provide: ImportAnalysis, useValue: { status: importStatus, supported } },
      ],
    });
    validation = TestBed.inject(TraceValidation);
  });

  describe('validate', () => {
    it('sends the current canvas XML as diagram.bpmn and keeps the result', async () => {
      api.validateTrace.mockReturnValue(of(TRACE_ACCEPTED));

      await validation.validate();

      const file = api.validateTrace.mock.calls[0][0] as File;
      expect(file.name).toBe('diagram.bpmn');
      expect(await file.text()).toBe('<definitions/>');
      expect(validation.status()).toBe('loaded');
      expect(validation.result()).toBe(TRACE_ACCEPTED);
    });

    it('sends the parsed tokens and the selected kind', async () => {
      api.validateTrace.mockReturnValue(of(TRACE_ACCEPTED));
      validation.setInput('start_1 → task_1, end_1');

      await validation.validate();

      expect(api.validateTrace.mock.calls[0].slice(1)).toEqual([['start_1', 'task_1', 'end_1'], 'symbols']);
    });

    it('sends diagram ids when that kind is selected', async () => {
      api.validateTrace.mockReturnValue(of(TRACE_ACCEPTED));
      validation.setInput('Start Review');
      validation.setInputKind('bpmn-ids');

      await validation.validate();

      expect(api.validateTrace.mock.calls[0].slice(1)).toEqual([['Start', 'Review'], 'bpmn-ids']);
    });

    it('treats an empty text as a valid empty trace', async () => {
      api.validateTrace.mockReturnValue(of(TRACE_NO_TRANSITION));
      validation.setInput('  ');

      await validation.validate();

      expect(api.validateTrace.mock.calls[0][1]).toEqual([]);
    });

    it('defaults to symbols', () => {
      expect(validation.inputKind()).toBe('symbols');
    });

    it.each<[string, ApiError]>([
      ['diagnostics', { kind: 'diagnostics', status: 422, message: null, diagnostics: [] }],
      ['message', { kind: 'message', status: 422, detail: { message: 'Invalid trace JSON' } }],
      ['validation', { kind: 'validation', status: 422, issues: [] }],
      ['network', { kind: 'network', status: 0 }],
      ['unknown', { kind: 'unknown', status: 500 }],
    ])('exposes a %s failure, no result and no route', async (_name, error) => {
      api.validateTrace.mockReturnValue(throwError(() => error));

      await validation.validate();

      expect(validation.status()).toBe('failed');
      expect(validation.failure()).toEqual(error);
      expect(validation.result()).toBeNull();
      expect(validation.pathShown()).toBe(false);
    });

    it('turns an unexpected throw into an unknown failure', async () => {
      api.validateTrace.mockReturnValue(throwError(() => new Error('boom')));
      await validation.validate();
      expect(validation.failure()).toEqual({ kind: 'unknown', status: 0 });
    });

    it('fails without calling the API when the canvas cannot be exported', async () => {
      modeler.exportXml.mockRejectedValue(new Error('no canvas'));
      await validation.validate();
      expect(api.validateTrace).not.toHaveBeenCalled();
      expect(validation.status()).toBe('failed');
    });

    it('is gated by supported', async () => {
      supported.set(false);
      expect(validation.canValidate()).toBe(false);

      await validation.validate();

      expect(api.validateTrace).not.toHaveBeenCalled();
      expect(validation.status()).toBe('idle');
    });

    it('does not start a second validation while one is running', async () => {
      const pending = new Subject<TraceValidationResult>();
      api.validateTrace.mockReturnValue(pending);

      const first = validation.validate();
      await flush();
      expect(validation.canValidate()).toBe(false);
      await validation.validate();
      pending.next(TRACE_ACCEPTED);
      pending.complete();
      await first;

      expect(api.validateTrace).toHaveBeenCalledTimes(1);
    });
  });

  describe('route on the canvas', () => {
    it('marks the consumed route, including the gateway, from the same response', async () => {
      api.validateTrace.mockReturnValue(of(TRACE_ACCEPTED));

      await validation.validate();

      expect([...lastPath().keys()].sort()).toEqual(
        ['Start', 'Review', 'Decide', 'Notify', 'EndOk', 'f1', 'f2', 'f3', 'f5'].sort(),
      );
      expect(validation.pathShown()).toBe(true);
    });

    it('marks the rejected element with its own marker', async () => {
      api.validateTrace.mockReturnValue(of(TRACE_NO_TRANSITION));

      await validation.validate();

      expect(lastPath().get('EndNo')).toBe('fr-rejected');
      expect(validation.pathShown()).toBe(true);
    });

    it('shows no route when nothing maps to the canvas', async () => {
      modeler.hasElement.mockReturnValue(false);
      api.validateTrace.mockReturnValue(of(TRACE_ACCEPTED));

      await validation.validate();

      expect(lastPath().size).toBe(0);
      expect(validation.pathShown()).toBe(false);
      expect(validation.status()).toBe('loaded');
    });

    it('"clearPath" removes the route and keeps the result', async () => {
      api.validateTrace.mockReturnValue(of(TRACE_ACCEPTED));
      await validation.validate();

      validation.clearPath();

      expect(lastPath().size).toBe(0);
      expect(validation.pathShown()).toBe(false);
      expect(validation.result()).toBe(TRACE_ACCEPTED);
    });

    it('replaces a simulated route and is not shown together with it', async () => {
      const highlight = TestBed.inject(PathHighlight);
      highlight.show('simulation', new Map([['Start', 'fr-path']]));
      api.validateTrace.mockReturnValue(of(TRACE_ACCEPTED));

      await validation.validate();

      expect(highlight.owner()).toBe('trace');
      expect(lastPath().has('EndOk')).toBe(true);
    });

    it('does not remove a simulated route it did not paint', async () => {
      const highlight = TestBed.inject(PathHighlight);
      highlight.show('simulation', new Map([['Start', 'fr-path']]));
      modeler.applyMarkers.mockClear();

      validation.clearPath();
      edited();

      expect(modeler.applyMarkers).not.toHaveBeenCalled();
      expect(highlight.owner()).toBe('simulation');
    });
  });

  describe('discarding', () => {
    beforeEach(async () => {
      api.validateTrace.mockReturnValue(of(TRACE_ACCEPTED));
      await validation.validate();
    });

    const expectDiscarded = () => {
      expect(validation.result()).toBeNull();
      expect(validation.status()).toBe('idle');
      expect(lastPath().size).toBe(0);
      expect(validation.pathShown()).toBe(false);
    };

    it('drops the result and the route when the diagram is edited', () => {
      edited();
      expectDiscarded();
    });

    it('drops the result and the route synchronously when a diagram load starts', () => {
      loadStarted();
      expectDiscarded();
    });

    it('drops the result and the route when a new check starts', () => {
      importStatus.set('loading');
      TestBed.tick();
      expectDiscarded();
    });

    it('drops the previous result and route as soon as a new validation starts', async () => {
      api.validateTrace.mockReturnValue(new Subject());
      void validation.validate();
      await flush();
      expect(validation.result()).toBeNull();
      expect(validation.status()).toBe('loading');
      expect(lastPath().size).toBe(0);
    });

    it('drops a failure and keeps the typed text and kind', async () => {
      validation.setInput('start_1 task_1');
      validation.setInputKind('bpmn-ids');
      api.validateTrace.mockReturnValue(throwError(() => ({ kind: 'network', status: 0 })));
      await validation.validate();

      edited();

      expect(validation.failure()).toBeNull();
      expect(validation.inputText()).toBe('start_1 task_1');
      expect(validation.inputKind()).toBe('bpmn-ids');
    });
  });

  describe('out-of-order responses', () => {
    it.each<[string, () => void]>([
      ['the diagram was edited', () => edited()],
      ['a diagram load started', () => loadStarted()],
      [
        'a new check started',
        () => {
          supported.set(false);
          importStatus.set('loading');
          TestBed.tick();
        },
      ],
    ])('ignores a response that arrives after %s', async (_name, interrupt) => {
      const pending = new Subject<TraceValidationResult>();
      api.validateTrace.mockReturnValue(pending);

      const running = validation.validate();
      await flush();
      interrupt();
      pending.next(TRACE_ACCEPTED);
      pending.complete();
      await running;

      expect(validation.result()).toBeNull();
      expect(validation.status()).toBe('idle');
      expect(validation.pathShown()).toBe(false);
      expect(lastPath().size).toBe(0);
    });

    it('ignores the older of two overlapping validations', async () => {
      const older = new Subject<TraceValidationResult>();
      const newer = new Subject<TraceValidationResult>();
      api.validateTrace.mockReturnValueOnce(older).mockReturnValueOnce(newer);

      const first = validation.validate();
      await flush();
      edited();
      const second = validation.validate();
      await flush();
      newer.next({ ...TRACE_ACCEPTED, process_id: 'newer' });
      newer.complete();
      await second;
      older.next({ ...TRACE_ACCEPTED, process_id: 'older' });
      older.complete();
      await first;

      expect(validation.result()?.process_id).toBe('newer');
    });

    it('ignores an older failure after a newer result', async () => {
      const older = new Subject<TraceValidationResult>();
      api.validateTrace.mockReturnValueOnce(older).mockReturnValueOnce(of(TRACE_ACCEPTED));

      const first = validation.validate();
      await flush();
      edited();
      await validation.validate();
      older.error({ kind: 'network', status: 0 });
      await first;

      expect(validation.failure()).toBeNull();
      expect(validation.status()).toBe('loaded');
    });

    it('claims its request before exporting, so an edit during the export wins', async () => {
      let release!: (xml: string) => void;
      modeler.exportXml.mockReturnValue(new Promise<string>((resolve) => (release = resolve)));
      api.validateTrace.mockReturnValue(of(TRACE_ACCEPTED));

      const running = validation.validate();
      await flush();
      edited();
      release('<definitions/>');
      await running;

      expect(validation.result()).toBeNull();
      expect(validation.status()).toBe('idle');
    });
  });
});
