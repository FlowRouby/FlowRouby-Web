import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { ApiError } from '../../../../core/models/api-error';
import type { CompileResult } from '../../../../core/models/compile-result';
import { ProcessApi } from '../../../../core/services/process-api';
import {
  INVALID_TRACE_BODY,
  TRACE_ACCEPTED,
  TRACE_NO_TRANSITION,
  TRACE_NOT_ACCEPTING,
  TRACE_UNKNOWN_SYMBOL,
} from '../../../../core/testing/trace-validation-fixtures';
import { BpmnModeler } from '../../../process-editor/services/bpmn-modeler';
import { CompileAnalysis } from '../../services/compile-analysis';
import { ImportAnalysis, type ImportStatus } from '../../services/import-analysis';
import { TraceValidationView } from './trace-validation-view';

describe('TraceValidationView', () => {
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
  const api = { validateTrace: vi.fn() };
  let fixture: ReturnType<typeof TestBed.createComponent<TraceValidationView>>;
  let root: HTMLElement;

  const settle = () => fixture.whenStable();
  const named = (label: string) =>
    [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label) as HTMLButtonElement | undefined;
  const input = () => root.querySelector('input') as HTMLInputElement;
  const select = () => root.querySelector('select') as HTMLSelectElement;
  const type = async (value: string) => {
    input().value = value;
    input().dispatchEvent(new Event('input'));
    await settle();
  };
  const wait = async () => {
    await settle();
    await new Promise((resolve) => setTimeout(resolve));
    await settle();
  };
  const validate = async () => {
    named('Validar cadena')!.click();
    await wait();
  };
  const text = () => (root.textContent ?? '').replace(/\s+/g, ' ');
  const squash = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim();
  /** The value shown for a term of the result list. */
  const field = (term: string) =>
    squash([...root.querySelectorAll('dt')].find((dt) => dt.textContent?.trim() === term)?.nextElementSibling?.textContent);
  const expectedParagraph = () => [...root.querySelectorAll('p')].find((p) => p.textContent?.includes('Símbolos esperados'));
  const expected = () => squash(expectedParagraph()?.textContent);
  const expectedRefs = () => [...(expectedParagraph()?.querySelectorAll('app-node-ref') ?? [])].map((ref) => squash(ref.textContent));

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
      imports: [TraceValidationView],
      providers: [
        { provide: BpmnModeler, useValue: modeler },
        { provide: ProcessApi, useValue: api },
        { provide: ImportAnalysis, useValue: { status: importStatus, stale, supported } },
        { provide: CompileAnalysis, useValue: { result: compileResult } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TraceValidationView);
    root = fixture.nativeElement;
    await settle();
  });

  describe('input', () => {
    it('labels the text input and the selector', () => {
      expect(root.querySelector('label[for="trace-input"]')?.textContent).toContain('Cadena a validar');
      expect(input().id).toBe('trace-input');
      expect(input().placeholder).toBe('start_1 task_1 end_1');
      expect(root.querySelector('label[for="trace-kind"]')).toBeTruthy();
      expect([...select().options].map((o) => o.textContent?.trim())).toEqual(['Símbolos del autómata', 'IDs del diagrama']);
    });

    it('sends the typed tokens as symbols by default', async () => {
      api.validateTrace.mockReturnValue(of(TRACE_ACCEPTED));
      await type('start_1 → task_1, task_2 end_1');
      await validate();

      expect(api.validateTrace.mock.calls[0].slice(1)).toEqual([['start_1', 'task_1', 'task_2', 'end_1'], 'symbols']);
    });

    it('sends diagram ids when the selector says so', async () => {
      api.validateTrace.mockReturnValue(of(TRACE_ACCEPTED));
      await type('Start Review');
      select().value = 'bpmn-ids';
      select().dispatchEvent(new Event('change'));
      await settle();
      await validate();

      expect(api.validateTrace.mock.calls[0].slice(1)).toEqual([['Start', 'Review'], 'bpmn-ids']);
    });

    it('submits with Enter in the input', async () => {
      api.validateTrace.mockReturnValue(of(TRACE_ACCEPTED));
      await type('start_1');
      input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await wait();

      expect(api.validateTrace).toHaveBeenCalledTimes(1);
    });

    it('validates an empty text as an empty trace', async () => {
      api.validateTrace.mockReturnValue(of(TRACE_NOT_ACCEPTING));
      await validate();
      expect(api.validateTrace.mock.calls[0][1]).toEqual([]);
    });
  });

  describe('action', () => {
    it('shows a loading label while validating', async () => {
      api.validateTrace.mockReturnValue(new Subject());
      named('Validar cadena')!.click();
      await wait();
      expect(named('Validando…')?.disabled).toBe(true);
      expect(root.querySelector('[role="status"]')?.textContent).toContain('Validando');
    });

    it('is disabled with the reason when the diagram is not supported', async () => {
      supported.set(false);
      importStatus.set('idle');
      await settle();

      const button = named('Validar cadena')!;
      expect(button.disabled).toBe(true);
      expect(root.querySelector('#trace-reason')?.textContent).toContain('Verifique el diagrama antes de validar');
      expect(button.getAttribute('aria-describedby')).toBe('trace-reason');
    });

    it('explains a stale diagram', async () => {
      supported.set(false);
      stale.set(true);
      await settle();
      expect(root.querySelector('#trace-reason')?.textContent).toContain('cambió');
    });

    it('has no reason and is enabled when supported', () => {
      expect(root.querySelector('#trace-reason')).toBeNull();
      expect(named('Validar cadena')!.disabled).toBe(false);
    });
  });

  describe('accepted trace', () => {
    beforeEach(async () => {
      api.validateTrace.mockReturnValue(of(TRACE_ACCEPTED));
      await validate();
    });

    it('says in text that the trace was accepted, inside a live region', () => {
      const outcome = root.querySelector('[aria-live="polite"]');
      expect(outcome?.textContent).toContain('Cadena aceptada');
      expect(outcome?.textContent).not.toContain('rechazada');
    });

    it('lists the consumed steps as from state, node and to state', () => {
      const steps = [...root.querySelectorAll('ol > li')];
      expect(steps).toHaveLength(4);
      expect([...steps[2].children].map((part) => squash(part.textContent))).toEqual(['3.', 'D2', '→', 'task_2 · Notify', '→', 'D3']);
      expect(steps.map((s) => s.querySelector('app-node-ref')?.textContent?.trim().split(' ')[0])).toEqual([
        'start_1',
        'task_1',
        'task_2',
        'end_1',
      ]);
    });

    it('shows the final state and no rejection details', () => {
      expect(field('Estado final')).toBe('D5');
      expect(text()).not.toContain('Motivo');
      expect(text()).not.toContain('Símbolo rechazado');
      expect(text()).not.toContain('Símbolos esperados');
    });

    it('focuses the element of a step through its node reference', () => {
      (root.querySelectorAll('ol > li')[1].querySelector('app-node-ref button') as HTMLButtonElement).click();
      expect(modeler.focusElement).toHaveBeenCalledWith('Review');
    });

    it('offers to remove the route from the canvas and keeps the result', async () => {
      modeler.applyMarkers.mockClear();
      const remove = named('Quitar ruta del diagrama');
      expect(remove).toBeTruthy();

      remove!.click();
      await settle();

      expect(modeler.applyMarkers).toHaveBeenLastCalledWith(new Map(), 'path');
      expect(named('Quitar ruta del diagrama')).toBeUndefined();
      expect(root.querySelectorAll('ol > li')).toHaveLength(4);
    });
  });

  describe('rejected trace', () => {
    it('states the rejection, reason, position and expected symbols', async () => {
      api.validateTrace.mockReturnValue(of(TRACE_NO_TRANSITION));
      await validate();

      expect(text()).toContain('Cadena rechazada');
      expect(text()).toContain('No hay una transición con ese símbolo');
      expect(field('Símbolo rechazado')).toBe('end_2 · EndNo (posición 3)');
      expect(expectedRefs()).toEqual(['task_2 · Notify', 'task_3 · Reject']);
      expect(root.querySelectorAll('ol > li')).toHaveLength(2);
    });

    it('shows an unknown symbol as plain text, since it has no node', async () => {
      api.validateTrace.mockReturnValue(of(TRACE_UNKNOWN_SYMBOL));
      await validate();

      expect(text()).toContain('alfabeto del autómata');
      expect(field('Símbolo rechazado')).toBe('nope (posición 2)');
      const rejected = [...root.querySelectorAll('dd')].find((dd) => dd.textContent?.includes('nope'));
      expect(rejected?.querySelector('button')).toBeNull();
    });

    it('does not name a rejected symbol when the string ended outside an accepting state', async () => {
      api.validateTrace.mockReturnValue(of(TRACE_NOT_ACCEPTING));
      await validate();

      expect(text()).toContain('Cadena rechazada');
      expect(text()).toContain('estado de aceptación');
      expect(text()).not.toContain('Símbolo rechazado');
    });

    it('shows "ninguno" when no symbol is expected', async () => {
      const base = TRACE_NOT_ACCEPTING.validation;
      api.validateTrace.mockReturnValue(of({ ...TRACE_NOT_ACCEPTING, validation: { ...base, expected_symbols: [] } }));
      await validate();

      expect(expected()).toContain('ninguno');
      expect(expectedRefs()).toEqual([]);
    });

    it('shows a generic reason for an unknown code', async () => {
      const base = TRACE_NO_TRANSITION.validation;
      api.validateTrace.mockReturnValue(of({ ...TRACE_NO_TRANSITION, validation: { ...base, rejection_reason: 'SOMETHING_NEW' } }));
      await validate();

      expect(text()).toContain('no reconoce');
    });

    it('says when no symbol was consumed', async () => {
      const base = TRACE_NOT_ACCEPTING.validation;
      api.validateTrace.mockReturnValue(of({ ...TRACE_NOT_ACCEPTING, validation: { ...base, steps: [], consumed: 0 } }));
      await validate();

      expect(text()).toContain('No se consumió ningún símbolo');
    });
  });

  it('renders a result whose elements are not on the canvas as plain text and offers no route to remove', async () => {
    modeler.hasElement.mockReturnValue(false);
    api.validateTrace.mockReturnValue(of(TRACE_ACCEPTED));
    await validate();

    expect(root.querySelector('ol > li app-node-ref button')).toBeNull();
    expect(named('Quitar ruta del diagrama')).toBeUndefined();
  });

  describe('failures', () => {
    const fail = async (error: ApiError) => {
      api.validateTrace.mockReturnValue(throwError(() => error));
      await validate();
    };

    it('translates the diagnostics of a 422 by code', async () => {
      await fail({
        kind: 'diagnostics',
        status: 422,
        message: 'raw',
        diagnostics: [{ severity: 'error', code: 'NO_END_EVENT', message: 'raw backend text', elementId: null, elementType: null, processId: 'P', blocksAnalysis: true, line: null }],
      });
      expect(text()).toContain('No se pudo validar la cadena');
      expect(text()).toContain('El proceso no tiene un evento de fin');
      expect(text()).not.toContain('raw backend text');
    });

    it('explains a bad trace in Spanish without the backend text', async () => {
      await fail({ kind: 'message', status: 422, detail: INVALID_TRACE_BODY.detail });
      expect(root.querySelector('[role="alert"]')?.textContent).toContain('tal como se escribió');
      expect(text()).not.toContain('Invalid trace');
    });

    it.each<[ApiError, string]>([
      [{ kind: 'network', status: 0 }, 'No se pudo conectar'],
      [{ kind: 'validation', status: 422, issues: [] }, 'no recibió un archivo válido'],
      [{ kind: 'unknown', status: 500 }, 'inesperado'],
    ])('shows the shared notice for %#', async (error, expected) => {
      await fail(error);
      expect(root.querySelector('[role="alert"]')?.textContent).toContain(expected);
    });

    it('shows no result and no route', async () => {
      await fail({ kind: 'network', status: 0 });
      expect(root.querySelector('section[aria-label="Resultado de la validación"]')).toBeNull();
      expect(named('Quitar ruta del diagrama')).toBeUndefined();
      expect(modeler.focusElement).not.toHaveBeenCalled();
    });
  });
});
