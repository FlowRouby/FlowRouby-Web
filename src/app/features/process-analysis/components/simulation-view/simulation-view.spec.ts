import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { ApiError } from '../../../../core/models/api-error';
import type { CompileResult } from '../../../../core/models/compile-result';
import { ProcessApi } from '../../../../core/services/process-api';
import { XOR_RESULT } from '../../../../core/testing/compile-fixtures';
import { INVALID_INPUT_DATA_BODY, SIMULATION_WITH_INPUT, SIMULATION_WITHOUT_INPUT } from '../../../../core/testing/simulation-fixtures';
import { BpmnModeler } from '../../../process-editor/services/bpmn-modeler';
import { CompileAnalysis } from '../../services/compile-analysis';
import { ImportAnalysis, type ImportStatus } from '../../services/import-analysis';
import { SimulationView } from './simulation-view';

describe('SimulationView', () => {
  const importStatus = signal<ImportStatus>('loaded');
  const stale = signal(false);
  const supported = signal(true);
  const compileResult = signal<CompileResult | null>(null);
  const modeler = {
    onEdited: vi.fn(),
    onLoad: vi.fn(),
    exportXml: vi.fn(),
    applyMarkers: vi.fn(),
    hasElement: vi.fn(),
    connectionBetween: vi.fn(),
    focusElement: vi.fn(),
  };
  const api = { simulate: vi.fn() };
  let fixture: ReturnType<typeof TestBed.createComponent<SimulationView>>;
  let root: HTMLElement;

  const settle = () => fixture.whenStable();
  const named = (label: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label) as HTMLButtonElement | undefined;
  const textarea = () => root.querySelector('textarea') as HTMLTextAreaElement;
  const type = async (text: string) => {
    textarea().value = text;
    textarea().dispatchEvent(new Event('input'));
    await settle();
  };
  const simulate = async () => {
    named('Simular')!.click();
    await settle();
    await new Promise((resolve) => setTimeout(resolve));
    await settle();
  };
  const text = () => (root.textContent ?? '').replace(/\s+/g, ' ');

  beforeEach(async () => {
    vi.resetAllMocks();
    importStatus.set('loaded');
    stale.set(false);
    supported.set(true);
    compileResult.set(null);
    modeler.exportXml.mockResolvedValue('<definitions/>');
    modeler.hasElement.mockReturnValue(true);
    modeler.connectionBetween.mockReturnValue(null);
    await TestBed.configureTestingModule({
      imports: [SimulationView],
      providers: [
        { provide: BpmnModeler, useValue: modeler },
        { provide: ProcessApi, useValue: api },
        { provide: ImportAnalysis, useValue: { status: importStatus, stale, supported } },
        { provide: CompileAnalysis, useValue: { result: compileResult } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SimulationView);
    root = fixture.nativeElement;
    await settle();
  });

  describe('input', () => {
    it('labels the textarea', () => {
      const label = root.querySelector('label[for="simulation-input"]');
      expect(label?.textContent).toContain('Datos de entrada');
      expect(textarea().id).toBe('simulation-input');
      expect(textarea().getAttribute('aria-invalid')).toBeNull();
    });

    it.each(['[1]', '5', '{bad'])('blocks %s with an inline error tied to the field and does not call the backend', async (value) => {
      await type(value);
      await simulate();

      expect(api.simulate).not.toHaveBeenCalled();
      expect(textarea().getAttribute('aria-invalid')).toBe('true');
      const error = root.querySelector('#simulation-input-error');
      expect(error?.textContent).toContain('objeto JSON válido');
      expect(textarea().getAttribute('aria-describedby')).toContain('simulation-input-error');
    });

    it('clears the error as soon as the text changes', async () => {
      await type('[1]');
      await simulate();
      await type('{}');
      expect(root.querySelector('#simulation-input-error')).toBeNull();
      expect(textarea().getAttribute('aria-invalid')).toBeNull();
    });

    it('sends no input_data when the field is empty', async () => {
      api.simulate.mockReturnValue(of(SIMULATION_WITHOUT_INPUT));
      await simulate();
      expect(api.simulate).toHaveBeenCalledTimes(1);
      expect(api.simulate.mock.calls[0][1]).toBeUndefined();
    });

    it('sends the typed object as input_data', async () => {
      api.simulate.mockReturnValue(of(SIMULATION_WITH_INPUT));
      await type('{"amount": 500}');
      await simulate();
      expect(api.simulate.mock.calls[0][1]).toBe('{"amount": 500}');
    });

    it('offers no sample button and no hint list without a compile result', () => {
      expect(named('Usar datos de ejemplo')).toBeUndefined();
      expect(root.querySelector('#simulation-input-required')).toBeNull();
    });

    it('lists the required inputs and fills the sample payload of the compile result', async () => {
      compileResult.set(XOR_RESULT);
      await settle();

      expect(root.querySelector('#simulation-input-required')?.textContent).toContain('amount (number)');
      named('Usar datos de ejemplo')!.click();
      await settle();

      expect(textarea().value).toBe(JSON.stringify(XOR_RESULT.data_contract.sample_payload, null, 2));
    });
  });

  describe('action', () => {
    it('shows a loading label while simulating', async () => {
      api.simulate.mockReturnValue(new Subject());
      named('Simular')!.click();
      await settle();
      await new Promise((resolve) => setTimeout(resolve));
      await settle();
      expect(named('Simulando…')?.disabled).toBe(true);
    });

    it('is disabled with the reason when the diagram is not supported', async () => {
      supported.set(false);
      importStatus.set('idle');
      await settle();

      const button = named('Simular')!;
      expect(button.disabled).toBe(true);
      expect(root.querySelector('#simulation-reason')?.textContent).toContain('Verifique el diagrama antes de simular');
      expect(button.getAttribute('aria-describedby')).toBe('simulation-reason');
    });

    it('explains a stale diagram', async () => {
      supported.set(false);
      stale.set(true);
      await settle();
      expect(root.querySelector('#simulation-reason')?.textContent).toContain('cambió');
    });

    it('has no reason and is enabled when supported', () => {
      expect(root.querySelector('#simulation-reason')).toBeNull();
      expect(named('Simular')!.disabled).toBe(false);
    });
  });

  describe('result', () => {
    beforeEach(async () => {
      api.simulate.mockReturnValue(of(SIMULATION_WITH_INPUT));
      await type('{"amount": 500}');
      await simulate();
    });

    it('shows the outcome in Spanish', () => {
      const values = [...root.querySelectorAll('dd')].map((dd) => dd.textContent?.trim());
      expect(values).toEqual(['Completada', 'Se alcanzó un evento de fin', 'Sí']);
    });

    it('lists the ordered steps with node, name, kind and action', () => {
      const steps = [...root.querySelectorAll('ol > li')];
      expect(steps).toHaveLength(5);
      expect(steps[0].textContent).toContain('1.');
      expect(steps[0].textContent).toContain('start_1 · Start');
      expect(steps[0].textContent).toContain('Request received');
      expect(steps[0].textContent).toContain('Inicio');
      expect(steps[1].textContent).toContain('Tarea de usuario');
      expect(steps[4].textContent).toContain('Reached EndEvent');
      expect(steps.map((s) => s.querySelector('app-node-ref')?.textContent?.trim().split(' ')[0])).toEqual([
        'start_1',
        'task_1',
        'decision_1',
        'task_2',
        'end_1',
      ]);
    });

    it('shows the selected targets of a gateway as node references', () => {
      const gateway = root.querySelectorAll('ol > li')[2];
      expect(gateway.textContent).toContain('Siguiente');
      expect(gateway.querySelectorAll('app-node-ref')[1].textContent).toContain('task_2 · Notify');
    });

    it('shows context updates only when there are some', () => {
      expect(root.querySelectorAll('ol > li')[0].textContent).not.toContain('Variables actualizadas');
    });

    it('shows the final context as pretty JSON', () => {
      expect(root.querySelector('pre[aria-label="Contexto final"]')?.textContent).toBe('{\n  "amount": 500\n}');
    });

    it('focuses the element of a step through its node reference', () => {
      const button = root.querySelectorAll('ol > li')[1].querySelector('app-node-ref button') as HTMLButtonElement;
      button.click();
      expect(modeler.focusElement).toHaveBeenCalledWith('Review');
    });

    it('shows "Limpiar ruta" while the route is on the canvas and removes it', async () => {
      modeler.connectionBetween.mockReturnValue(null);
      const clear = named('Limpiar ruta');
      expect(clear).toBeTruthy();

      clear!.click();
      await settle();

      expect(modeler.applyMarkers).toHaveBeenLastCalledWith(new Map(), 'path');
      expect(named('Limpiar ruta')).toBeUndefined();
      expect(root.querySelectorAll('ol > li')).toHaveLength(5);
    });
  });

  it('renders a result without bpmn_node_ids as plain text and offers no route to clear', async () => {
    api.simulate.mockReturnValue(of({ ...SIMULATION_WITHOUT_INPUT, bpmn_node_ids: null }));
    await simulate();

    const first = root.querySelector('ol > li app-node-ref')!;
    expect(first.textContent?.trim()).toBe('start_1');
    expect(first.querySelector('button')).toBeNull();
    expect(named('Limpiar ruta')).toBeUndefined();
  });

  describe('a loop the data never leaves', () => {
    beforeEach(async () => {
      const loop = ['gateway_1', 'task_1', 'gateway_2', 'task_2'];
      const nodes = ['start_1', ...Array.from({ length: 99 }, (_, index) => loop[index % loop.length])];
      api.simulate.mockReturnValue(
        of({
          ...SIMULATION_WITH_INPUT,
          bpmn_node_ids: null,
          simulation: {
            ...SIMULATION_WITH_INPUT.simulation,
            completed: false,
            terminated_reason: 'MAX_STEPS_EXCEEDED',
            visited_nodes: nodes,
            step_logs: nodes.map((node_id, index) => ({ step: index + 1, node_id, name: node_id, kind: 'user_task' })),
          },
        }),
      );
      await simulate();
    });

    it('warns that the process does not end with this data', () => {
      const alert = root.querySelector('section[aria-label="Resultado de la simulación"] [role="alert"]');
      expect(alert?.textContent).toContain('Con estos datos el proceso no termina');
      expect(alert?.textContent).toContain('tras 100 pasos');
    });

    it('shows the loop once and one line for its identical runs', () => {
      const items = [...root.querySelectorAll('ol > li')];
      const repeats = items.filter((item) => item.hasAttribute('data-repeat'));

      expect(items.length).toBeLessThan(10);
      expect(repeats).toHaveLength(1);
      expect(repeats[0].textContent?.replace(/\s+/g, ' ')).toContain('Los 4 pasos anteriores se repitieron igual 23 veces más (pasos 6 a 97).');
    });
  });

  it('shows no step-limit warning and no collapsed line for a run that ends', async () => {
    api.simulate.mockReturnValue(of(SIMULATION_WITH_INPUT));
    await simulate();

    expect(root.querySelector('section[aria-label="Resultado de la simulación"] [role="alert"]')).toBeNull();
    expect(root.querySelector('li[data-repeat]')).toBeNull();
  });

  it('shows an unknown termination code and an unknown step kind as raw codes', async () => {
    const base = SIMULATION_WITH_INPUT.simulation;
    api.simulate.mockReturnValue(
      of({
        ...SIMULATION_WITH_INPUT,
        simulation: {
          ...base,
          completed: false,
          terminated_reason: 'SOMETHING_NEW',
          accepted_by_dfa: null,
          step_logs: [{ step: 1, node_id: 'start_1', name: 'x', kind: 'strange_kind', context_updates: { total: 3 } }],
        },
      }),
    );
    await simulate();

    expect(text()).toContain('No completada');
    expect(text()).toContain('SOMETHING_NEW');
    expect(text()).toContain('No evaluada');
    expect(text()).toContain('strange_kind');
    expect(text()).toContain('Variables actualizadas');
  });

  describe('failures', () => {
    const fail = async (error: ApiError) => {
      api.simulate.mockReturnValue(throwError(() => error));
      await simulate();
    };

    it('translates the diagnostics of a 422 by code', async () => {
      await fail({
        kind: 'diagnostics',
        status: 422,
        message: 'raw',
        diagnostics: [{ severity: 'error', code: 'NO_END_EVENT', message: 'raw backend text', elementId: null, elementType: null, processId: 'P', blocksAnalysis: true, line: null }],
      });
      expect(text()).toContain('No se pudo simular');
      expect(text()).toContain('El proceso no tiene un evento de fin');
      expect(text()).not.toContain('raw backend text');
    });

    it('explains invalid input_data in Spanish with the backend text as secondary detail', async () => {
      await fail({ kind: 'message', status: 422, detail: INVALID_INPUT_DATA_BODY.detail });
      expect(root.querySelector('[role="alert"]')?.textContent).toContain('datos de entrada');
      expect(root.querySelector('[role="alert"]')?.textContent).not.toContain('Invalid input_data');
      expect(text()).toContain('Invalid input_data JSON');
    });

    it.each<[ApiError, string]>([
      [{ kind: 'network', status: 0 }, 'No se pudo conectar'],
      [{ kind: 'validation', status: 422, issues: [] }, 'no recibió un archivo válido'],
      [{ kind: 'unknown', status: 500 }, 'inesperado'],
    ])('shows the shared notice for %#', async (error, expected) => {
      await fail(error);
      expect(root.querySelector('[role="alert"]')?.textContent).toContain(expected);
    });

    it('never touches the canvas or shows a route', async () => {
      await fail({ kind: 'network', status: 0 });
      expect(modeler.focusElement).not.toHaveBeenCalled();
      expect(modeler.applyMarkers.mock.calls.every(([markers]) => (markers as Map<string, string>).size === 0)).toBe(true);
      expect(named('Limpiar ruta')).toBeUndefined();
    });
  });
});
