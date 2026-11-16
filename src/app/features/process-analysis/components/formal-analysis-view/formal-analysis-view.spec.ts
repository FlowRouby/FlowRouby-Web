import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { CompileResult } from '../../../../core/models/compile-result';
import { LOOP_RESULT, XOR_RESULT } from '../../../../core/testing/compile-fixtures';
import { BpmnModeler } from '../../../process-editor/services/bpmn-modeler';
import { CompileAnalysis } from '../../services/compile-analysis';
import { FormalAnalysisView } from './formal-analysis-view';

describe('FormalAnalysisView', () => {
  const current = signal<CompileResult | null>(null);
  const onCanvas = new Set(['Start', 'Review', 'Decide', 'Notify', 'Reject', 'EndOk', 'EndNo', 'Join']);
  const modeler = { hasElement: vi.fn((id: string) => onCanvas.has(id)), focusElement: vi.fn() };

  const render = async (result: CompileResult) => {
    current.set(result);
    const fixture = TestBed.createComponent(FormalAnalysisView);
    fixture.componentRef.setInput('result', result);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return { root, text: () => (root.textContent ?? '').replace(/\s+/g, ' ') };
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [FormalAnalysisView],
      providers: [
        {
          provide: CompileAnalysis,
          useValue: {
            result: current,
            bpmnIdOf: (symbol: string) => current()?.bpmn_node_ids[symbol] ?? null,
          },
        },
        { provide: BpmnModeler, useValue: modeler },
      ],
    }).compileComponents();
  });

  it('shows the valid state as text, with classification, regex and NFA state count', async () => {
    const { text } = await render(XOR_RESULT);
    expect(text()).toContain('Flujo de trabajo válido');
    expect(text()).toContain('Type-3');
    expect(text()).toContain('(start_1 · task_1 · task_2 · end_1 | start_1 · task_1 · task_3 · end_2)');
    expect(text()).toContain('Estados del ε-NFA: 15 (el servidor');
    expect(text()).toContain('no su estructura');
  });

  it('renders the DFA table with a cell per state and symbol, marking start and accept states', async () => {
    const { root } = await render(XOR_RESULT);
    const rows = [...root.querySelectorAll('table[aria-label="Tabla de transiciones del DFA"] tbody tr')];
    const cells = (row: Element) => [...row.querySelectorAll('td')].map((c) => c.textContent?.trim());

    expect(rows).toHaveLength(7);
    // Flow order: start_1, task_1, task_2, task_3, end_1, end_2
    expect(cells(rows[0])).toEqual(['D1', '', '', '', '', '']);
    expect(cells(rows[2])).toEqual(['', '', 'D3', 'D4', '', '']);
    expect(cells(rows[3])).toEqual(['', '', '', '', 'D5', '']);
    expect(rows[0].querySelector('th')?.textContent).toContain('(inicial)');
    expect(rows[5].querySelector('th')?.textContent).toContain('(aceptación)');
    expect(rows[1].querySelector('th')?.textContent).not.toContain('(');
  });

  it('shows a symbol with its BPMN id as a button that focuses the element', async () => {
    const { root } = await render(XOR_RESULT);
    const button = [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'task_1 · Review');

    button?.click();

    expect(modeler.focusElement).toHaveBeenCalledWith('Review');
    expect(modeler.focusElement).not.toHaveBeenCalledWith('task_1');
  });

  it('shows plain text, never a button, when the element is not on the canvas', async () => {
    onCanvas.delete('Notify');
    const { root } = await render(XOR_RESULT);
    onCanvas.add('Notify');

    expect([...root.querySelectorAll('button')].some((b) => b.textContent?.includes('task_2'))).toBe(false);
    expect(root.textContent).toContain('task_2 · Notify');
  });

  it('shows an unmapped symbol as plain text', async () => {
    const { root } = await render({ ...XOR_RESULT, bpmn_node_ids: {} });
    expect(root.querySelectorAll('button')).toHaveLength(0);
    expect(root.textContent).toContain('start_1');
  });

  it('shows the invalid state, the empty regex and the findings of a broken workflow', async () => {
    const { root, text } = await render(LOOP_RESULT);

    expect(text()).toContain('Flujo de trabajo inválido');
    expect(root.querySelector('section[aria-label="Expresión regular"] p')?.textContent).toBe('∅');
    expect(text()).toContain('No se encontró ningún camino.');
    expect(text()).toContain('Estados de aceptación: ninguno');
    const unreachable = root.querySelector('section[aria-label="Nodos inalcanzables"]');
    expect(unreachable?.textContent).toContain('end_1 · End');
    expect(unreachable?.textContent).toContain('task_3 · Orphan');
  });

  it('labels deadlocks by type, linking the node and keeping the backend message as detail', async () => {
    const { root } = await render(LOOP_RESULT);
    const items = [...root.querySelectorAll('section[aria-label="Bloqueos"] li')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim());

    expect(items).toHaveLength(3);
    expect(items[0]).toContain('Bloqueo en una compuerta de convergencia');
    expect(items[0]).toContain('parallel_2 · Join');
    expect(items[0]).toContain('Converging ParallelGateway');
    expect(items[1]).toContain('Estado del autómata sin salida');
    expect(items[1]).toContain('estado D2');
  });

  it('uses a generic label for an unknown deadlock type', async () => {
    const result = structuredClone(LOOP_RESULT);
    result.formal_analysis.diagnostics.deadlocks = [{ type: 'NEW_KIND', message: 'm' }];
    expect((await render(result)).text()).toContain('Bloqueo detectado');
  });

  it('lists acyclic paths with arrows between mapped symbols', async () => {
    const { root } = await render(XOR_RESULT);
    const paths = root.querySelectorAll('section[aria-label="Caminos acíclicos"] li');
    expect(paths).toHaveLength(2);
    expect(paths[0].textContent?.replace(/\s+/g, ' ')).toContain('start_1 · Start → task_1 · Review → task_2 · Notify');
  });

  it('renders unknown-shaped arrays only when non-empty', async () => {
    expect((await render(XOR_RESULT)).root.querySelectorAll('pre')).toHaveLength(0);

    const result = structuredClone(XOR_RESULT);
    result.formal_analysis.diagnostics.infinite_loops = [{ nodes: ['a'] }];
    const { root } = await render(result);
    expect(root.querySelector('section[aria-label="Ciclos infinitos"] pre')?.textContent).toBe('[{"nodes":["a"]}]');
    expect(root.querySelector('section[aria-label="Ciclos válidos"]')).toBeNull();
  });

  it('shows compile diagnostics translated by code, only when present', async () => {
    expect((await render(XOR_RESULT)).root.querySelector('app-diagnostic-list')).toBeNull();

    const result = structuredClone(XOR_RESULT);
    result.validation.diagnostics = [
      { severity: 'warning', code: 'DISCONNECTED_NODE', message: 'raw text', elementId: 'Lonely', elementType: 'task', processId: 'P', blocksAnalysis: false, line: 3 },
    ];
    const { text } = await render(result);
    expect(text()).toContain('El nodo no tiene conexiones.');
    expect(text()).not.toContain('raw text');
  });
});
