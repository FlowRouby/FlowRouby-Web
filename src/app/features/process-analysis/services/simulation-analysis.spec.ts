import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import type { ApiError } from '../../../core/models/api-error';
import type { SimulationResult } from '../../../core/models/simulation-result';
import { ProcessApi } from '../../../core/services/process-api';
import { SIMULATION_WITH_INPUT } from '../../../core/testing/simulation-fixtures';
import { BpmnModeler } from '../../process-editor/services/bpmn-modeler';
import { ImportAnalysis, type ImportStatus } from './import-analysis';
import { SimulationAnalysis } from './simulation-analysis';

describe('SimulationAnalysis', () => {
  let edited: () => void;
  let loadStarted: () => void;
  const importStatus = signal<ImportStatus>('loaded');
  const supported = signal(true);
  const flows: Record<string, string> = { 'Start>Review': 'f1', 'Review>Decide': 'f2', 'Decide>Notify': 'f3', 'Notify>EndOk': 'f5' };
  const modeler = {
    onEdited: vi.fn(),
    onLoad: vi.fn(),
    exportXml: vi.fn(),
    applyMarkers: vi.fn(),
    hasElement: vi.fn(),
    connectionBetween: vi.fn(),
  };
  const api = { simulate: vi.fn() };
  let simulation: SimulationAnalysis;

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
    simulation = TestBed.inject(SimulationAnalysis);
  });

  describe('simulate', () => {
    it('sends the current canvas XML as diagram.bpmn and keeps the result', async () => {
      api.simulate.mockReturnValue(of(SIMULATION_WITH_INPUT));

      await simulation.simulate();

      const file = api.simulate.mock.calls[0][0] as File;
      expect(file.name).toBe('diagram.bpmn');
      expect(await file.text()).toBe('<definitions/>');
      expect(simulation.status()).toBe('loaded');
      expect(simulation.result()).toBe(SIMULATION_WITH_INPUT);
    });

    it('sends no input_data when the text is empty', async () => {
      api.simulate.mockReturnValue(of(SIMULATION_WITH_INPUT));
      simulation.setInput('   ');

      await simulation.simulate();

      expect(api.simulate.mock.calls[0][1]).toBeUndefined();
    });

    it('sends the typed JSON object as input_data', async () => {
      api.simulate.mockReturnValue(of(SIMULATION_WITH_INPUT));
      simulation.setInput(' {"amount": 500} ');

      await simulation.simulate();

      expect(api.simulate.mock.calls[0][1]).toBe('{"amount": 500}');
    });

    it.each(['[1]', '5', 'null', '{bad', '"text"'])('does not call the backend for invalid input_data %s', async (text) => {
      simulation.setInput(text);

      await simulation.simulate();

      expect(api.simulate).not.toHaveBeenCalled();
      expect(modeler.exportXml).not.toHaveBeenCalled();
      expect(simulation.inputInvalid()).toBe(true);
      expect(simulation.status()).toBe('idle');
    });

    it('clears the input error when the text changes', async () => {
      simulation.setInput('[1]');
      await simulation.simulate();
      simulation.setInput('{}');
      expect(simulation.inputInvalid()).toBe(false);
    });

    it.each<[string, ApiError]>([
      ['diagnostics', { kind: 'diagnostics', status: 422, message: null, diagnostics: [] }],
      ['message', { kind: 'message', status: 422, detail: { message: 'Invalid input_data JSON' } }],
      ['validation', { kind: 'validation', status: 422, issues: [] }],
      ['network', { kind: 'network', status: 0 }],
      ['unknown', { kind: 'unknown', status: 500 }],
    ])('exposes a %s failure, no result and no route', async (_name, error) => {
      api.simulate.mockReturnValue(throwError(() => error));

      await simulation.simulate();

      expect(simulation.status()).toBe('failed');
      expect(simulation.failure()).toEqual(error);
      expect(simulation.result()).toBeNull();
      expect(simulation.pathShown()).toBe(false);
    });

    it('turns an unexpected throw into an unknown failure', async () => {
      api.simulate.mockReturnValue(throwError(() => new Error('boom')));
      await simulation.simulate();
      expect(simulation.failure()).toEqual({ kind: 'unknown', status: 0 });
    });

    it('fails without calling the API when the canvas cannot be exported', async () => {
      modeler.exportXml.mockRejectedValue(new Error('no canvas'));
      await simulation.simulate();
      expect(api.simulate).not.toHaveBeenCalled();
      expect(simulation.status()).toBe('failed');
    });

    it('is gated by supported', async () => {
      supported.set(false);
      expect(simulation.canSimulate()).toBe(false);

      await simulation.simulate();

      expect(api.simulate).not.toHaveBeenCalled();
      expect(simulation.status()).toBe('idle');
    });

    it('does not start a second simulation while one is running', async () => {
      const pending = new Subject<SimulationResult>();
      api.simulate.mockReturnValue(pending);

      const first = simulation.simulate();
      await flush();
      expect(simulation.canSimulate()).toBe(false);
      await simulation.simulate();
      pending.next(SIMULATION_WITH_INPUT);
      pending.complete();
      await first;

      expect(api.simulate).toHaveBeenCalledTimes(1);
    });
  });

  describe('route on the canvas', () => {
    it('marks the visited elements and the traversed flows from the same response', async () => {
      api.simulate.mockReturnValue(of(SIMULATION_WITH_INPUT));

      await simulation.simulate();

      expect([...lastPath().keys()].sort()).toEqual(
        ['Start', 'Review', 'Decide', 'Notify', 'EndOk', 'f1', 'f2', 'f3', 'f5'].sort(),
      );
      expect(new Set(lastPath().values())).toEqual(new Set(['fr-path']));
      expect(simulation.pathShown()).toBe(true);
    });

    it('marks nothing when the response has no bpmn_node_ids', async () => {
      api.simulate.mockReturnValue(of({ ...SIMULATION_WITH_INPUT, bpmn_node_ids: null }));

      await simulation.simulate();

      expect(lastPath().size).toBe(0);
      expect(simulation.pathShown()).toBe(false);
      expect(simulation.status()).toBe('loaded');
    });

    it('"Limpiar ruta" removes the route and keeps the result', async () => {
      api.simulate.mockReturnValue(of(SIMULATION_WITH_INPUT));
      await simulation.simulate();

      simulation.clearPath();

      expect(lastPath().size).toBe(0);
      expect(simulation.pathShown()).toBe(false);
      expect(simulation.result()).toBe(SIMULATION_WITH_INPUT);
    });
  });

  describe('discarding', () => {
    beforeEach(async () => {
      api.simulate.mockReturnValue(of(SIMULATION_WITH_INPUT));
      await simulation.simulate();
    });

    const expectDiscarded = () => {
      expect(simulation.result()).toBeNull();
      expect(simulation.status()).toBe('idle');
      expect(lastPath().size).toBe(0);
      expect(simulation.pathShown()).toBe(false);
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

    it('drops the previous result and route as soon as a new simulation starts', async () => {
      api.simulate.mockReturnValue(new Subject());
      void simulation.simulate();
      await flush();
      expect(simulation.result()).toBeNull();
      expect(simulation.status()).toBe('loading');
      expect(lastPath().size).toBe(0);
    });

    it('drops a failure and keeps the typed input', async () => {
      simulation.setInput('{"a": 1}');
      api.simulate.mockReturnValue(throwError(() => ({ kind: 'network', status: 0 })));
      await simulation.simulate();

      edited();

      expect(simulation.failure()).toBeNull();
      expect(simulation.inputText()).toBe('{"a": 1}');
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
      const pending = new Subject<SimulationResult>();
      api.simulate.mockReturnValue(pending);

      const running = simulation.simulate();
      await flush();
      interrupt();
      pending.next(SIMULATION_WITH_INPUT);
      pending.complete();
      await running;

      expect(simulation.result()).toBeNull();
      expect(simulation.status()).toBe('idle');
      expect(simulation.pathShown()).toBe(false);
      expect(lastPath().size).toBe(0);
    });

    it('ignores the older of two overlapping simulations', async () => {
      const older = new Subject<SimulationResult>();
      const newer = new Subject<SimulationResult>();
      api.simulate.mockReturnValueOnce(older).mockReturnValueOnce(newer);

      const first = simulation.simulate();
      await flush();
      edited();
      const second = simulation.simulate();
      await flush();
      newer.next({ ...SIMULATION_WITH_INPUT, process_id: 'newer' });
      newer.complete();
      await second;
      older.next({ ...SIMULATION_WITH_INPUT, process_id: 'older' });
      older.complete();
      await first;

      expect(simulation.result()?.process_id).toBe('newer');
    });

    it('ignores an older failure after a newer result', async () => {
      const older = new Subject<SimulationResult>();
      api.simulate.mockReturnValueOnce(older).mockReturnValueOnce(of(SIMULATION_WITH_INPUT));

      const first = simulation.simulate();
      await flush();
      edited();
      await simulation.simulate();
      older.error({ kind: 'network', status: 0 });
      await first;

      expect(simulation.failure()).toBeNull();
      expect(simulation.status()).toBe('loaded');
    });
  });
});
