import { TestBed } from '@angular/core/testing';
import { VALID_LOOP_RESULT, XOR_RESULT } from '../../../../core/testing/compile-fixtures';
import type { Dfa, LoopFinding } from '../../../../core/models/compile-result';
import { DfaDiagram } from './dfa-diagram';

describe('DfaDiagram', () => {
  const render = async (dfa: Dfa, loops: readonly LoopFinding[] = []) => {
    const fixture = TestBed.createComponent(DfaDiagram);
    fixture.componentRef.setInput('dfa', dfa);
    fixture.componentRef.setInput('loops', loops);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    return { root, svg: root.querySelector('svg') as SVGSVGElement };
  };

  it('draws an accessible svg with one group per state and per transition', async () => {
    const { svg } = await render(XOR_RESULT.formal_analysis.dfa);

    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Diagrama de estados del DFA');
    expect(svg.querySelectorAll('g.dfa-node')).toHaveLength(7);
    expect(svg.querySelectorAll('g.dfa-edge')).toHaveLength(6);
    expect(svg.closest('div')?.className).toContain('overflow-x-auto');
  });

  it('shows the state names and the edge labels as text', async () => {
    const { svg } = await render(XOR_RESULT.formal_analysis.dfa);
    const texts = [...svg.querySelectorAll('text')].map((t) => t.textContent?.trim());

    expect(texts).toEqual(expect.arrayContaining(['D0', 'D6', 'start_1', 'task_3', 'end_2']));
  });

  it('marks the start state with an entry arrow and accept states with a double circle', async () => {
    const { svg } = await render(XOR_RESULT.formal_analysis.dfa);
    const circles = (state: string) => svg.querySelectorAll(`g[data-state="${state}"] circle`).length;

    expect(svg.querySelectorAll(':scope > line')).toHaveLength(1);
    expect(circles('D0')).toBe(1);
    expect(circles('D1')).toBe(1);
    expect(circles('D5')).toBe(2);
    expect(circles('D6')).toBe(2);
    expect(svg.querySelectorAll('circle.dfa-accept')).toHaveLength(2);
  });

  it('gives every edge an arrowhead through a marker defined in the svg', async () => {
    const { svg } = await render(XOR_RESULT.formal_analysis.dfa);
    const paths = [...svg.querySelectorAll('g.dfa-edge path')];
    const ids = [...svg.querySelectorAll('marker')].map((m) => m.id);

    expect(ids).toHaveLength(3);
    for (const path of paths) {
      const id = /url\(#(.+)\)/.exec(path.getAttribute('marker-end') ?? '')?.[1];
      expect(ids).toContain(id);
    }
  });

  it('uses distinct marker ids in each instance', async () => {
    const first = await render(XOR_RESULT.formal_analysis.dfa);
    const second = await render(XOR_RESULT.formal_analysis.dfa);

    expect(first.svg.querySelector('marker')?.id).not.toBe(second.svg.querySelector('marker')?.id);
  });

  it('draws no loop styling and no loop legend when there is no loop', async () => {
    const { root, svg } = await render(XOR_RESULT.formal_analysis.dfa);

    expect(svg.querySelectorAll('[data-loop]:not([data-loop=""])')).toHaveLength(0);
    expect(svg.querySelector('.stroke-info, .stroke-danger')).toBeNull();
    expect(root.textContent).toContain('Flecha de entrada: estado inicial. Doble círculo: estado de aceptación.');
    expect(root.textContent).not.toContain('Trazo grueso');
  });

  it('draws the states and transitions of a valid loop with the info colour and a thicker stroke', async () => {
    const { root, svg } = await render(VALID_LOOP_RESULT.formal_analysis.dfa, VALID_LOOP_RESULT.formal_analysis.diagnostics.valid_loops);
    const circle = (state: string) => svg.querySelector(`g[data-state="${state}"] circle`) as SVGCircleElement;
    const edgePath = (from: string, to: string) =>
      [...svg.querySelectorAll('g.dfa-edge')].find((g) => g.textContent?.trim() === (from === 'D4' ? 'task_1' : 'task_2') && g.getAttribute('data-loop') === 'valid')?.querySelector('path') ?? null;

    expect(svg.querySelectorAll('g.dfa-node[data-loop="valid"]')).toHaveLength(2);
    expect(svg.querySelectorAll('g.dfa-edge[data-loop="valid"]')).toHaveLength(2);
    expect(circle('D2').classList).toContain('stroke-info');
    expect(circle('D2').getAttribute('stroke-width')).toBe('3');
    expect(circle('D0').classList).toContain('stroke-content');
    expect(circle('D0').getAttribute('stroke-width')).toBe('1.5');
    expect(edgePath('D4', 'D2')?.getAttribute('stroke-width')).toBe('3');
    expect(edgePath('D2', 'D4')?.classList).toContain('stroke-info');
    expect(root.textContent).toContain('Trazo grueso: estados y transiciones de un ciclo.');
  });

  it('draws an infinite loop with the danger colour', async () => {
    const finding: LoopFinding = { type: 'INFINITE_LOOP_TRAP', dfa_states: ['D2', 'D4'], activities: ['task_1', 'task_2'], message: '' };
    const { svg } = await render(VALID_LOOP_RESULT.formal_analysis.dfa, [finding]);

    expect(svg.querySelector('g[data-state="D2"] circle')?.classList).toContain('stroke-danger');
    expect(svg.querySelectorAll('g.dfa-edge[data-loop="infinite"]')).toHaveLength(2);
  });
});
