import type { Dfa, LoopFinding } from '../../../core/models/compile-result';
import { VALID_LOOP_RESULT, XOR_RESULT } from '../../../core/testing/compile-fixtures';
import { dfaDiagram } from './dfa-diagram';

const dfa = (transitions: Record<string, Record<string, string>>, extra: Partial<Dfa> = {}): Dfa => {
  const states = Object.keys(transitions);
  const alphabet = [...new Set(Object.values(transitions).flatMap((row) => Object.keys(row)))];
  return { states, alphabet, start_state: states[0], accept_states: [], transitions, state_subsets: {}, ...extra };
};

const node = (diagram: ReturnType<typeof dfaDiagram>, state: string) => diagram.nodes.find((n) => n.state === state)!;
const edge = (diagram: ReturnType<typeof dfaDiagram>, from: string, to: string) =>
  diagram.edges.find((e) => e.from === from && e.to === to)!;

describe('dfaDiagram', () => {
  it('lays the XOR fixture out in one column per breadth-first layer, left to right', () => {
    const diagram = dfaDiagram(XOR_RESULT.formal_analysis.dfa, []);

    expect(diagram.nodes).toHaveLength(7);
    expect(diagram.edges).toHaveLength(6);
    const xs = ['D0', 'D1', 'D2', 'D3', 'D5'].map((state) => node(diagram, state).x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(new Set(xs).size).toBe(5);
    expect(node(diagram, 'D3').x).toBe(node(diagram, 'D4').x);
    expect(node(diagram, 'D5').x).toBe(node(diagram, 'D6').x);
    // Same layer keeps the flow order (task_2 before task_3) and is centred around the middle of the row above.
    expect(node(diagram, 'D3').y).toBeLessThan(node(diagram, 'D4').y);
    expect((node(diagram, 'D3').y + node(diagram, 'D4').y) / 2).toBeCloseTo(node(diagram, 'D2').y);
    expect(node(diagram, 'D0').isStart).toBe(true);
    expect(node(diagram, 'D5').isAccept).toBe(true);
    expect(node(diagram, 'D1').isAccept).toBe(false);
    expect(diagram.nodes.every((n) => n.loop === null)).toBe(true);
    expect(diagram.edges.every((e) => e.loop === null)).toBe(true);
  });

  it('keeps the labels of two crossing arrows apart', () => {
    const diagram = dfaDiagram(
      dfa({ S: { a: 'A', b: 'B' }, A: { x: 'C', y: 'D' }, B: { x: 'D', y: 'C' }, C: {}, D: {} }),
      [],
    );
    const down = edge(diagram, 'A', 'D');
    const up = edge(diagram, 'B', 'C');

    expect(node(diagram, 'A').y).toBeLessThan(node(diagram, 'B').y);
    expect(node(diagram, 'C').y).toBeLessThan(node(diagram, 'D').y);
    expect(Math.abs(down.labelY - up.labelY)).toBeGreaterThanOrEqual(16);
  });

  it('bows an arrow going up the last column to the right, away from the incoming arrows', () => {
    const diagram = dfaDiagram(dfa({ S: { a: 'A', b: 'B' }, A: {}, B: { up: 'A' } }), []);
    const up = edge(diagram, 'B', 'A');

    expect(node(diagram, 'A').y).toBeLessThan(node(diagram, 'B').y);
    expect(up.labelX).toBeGreaterThan(node(diagram, 'A').x + diagram.radius);
    expect(up.labelX).toBeLessThan(diagram.width);
  });

  it('draws adjacent forward edges as straight lines from circle border to circle border', () => {
    const diagram = dfaDiagram(XOR_RESULT.formal_analysis.dfa, []);
    const first = edge(diagram, 'D0', 'D1');
    const a = node(diagram, 'D0');
    const b = node(diagram, 'D1');

    expect(first.symbols).toEqual(['start_1']);
    expect(first.label).toBe('start_1');
    expect(first.path).toBe(`M ${a.x + diagram.radius} ${a.y} L ${b.x - diagram.radius} ${b.y}`);
    // The label sits nearer the source than the midpoint, clear of both circles.
    expect(first.labelX).toBeGreaterThan(a.x + diagram.radius);
    expect(first.labelX).toBeLessThan((a.x + b.x) / 2);
    expect(first.labelY).toBeCloseTo(a.y);
    expect(diagram.width).toBeGreaterThan(node(diagram, 'D5').x + diagram.radius);
    expect(diagram.height).toBeGreaterThanOrEqual(node(diagram, 'D4').y + diagram.radius);
    expect(diagram.entry).toEqual({ x1: a.x - diagram.radius - 30, y1: a.y, x2: a.x - diagram.radius, y2: a.y });
    expect(diagram.entry!.x1).toBeGreaterThan(0);
  });

  it('leaves the column gap wide enough for the longest label between adjacent columns', () => {
    const wide = dfaDiagram(dfa({ A: { 'a_very_long_symbol_name, other_symbol': 'B', x: 'B' }, B: {} }), []);
    const narrow = dfaDiagram(dfa({ A: { a: 'B' }, B: {} }), []);
    const gap = (d: ReturnType<typeof dfaDiagram>) => node(d, 'B').x - node(d, 'A').x;
    const labelWidth = edge(wide, 'A', 'B').label.length * 7;

    expect(edge(wide, 'A', 'B').symbols).toEqual(['a_very_long_symbol_name, other_symbol', 'x']);
    expect(gap(wide) - 2 * wide.radius).toBeGreaterThan(labelWidth);
    expect(gap(wide)).toBeGreaterThan(gap(narrow));
  });

  it('merges transitions with the same source and target into one edge with a joined label', () => {
    const diagram = dfaDiagram(dfa({ A: { x: 'B', y: 'B', z: 'C' }, B: {}, C: {} }), []);

    expect(diagram.edges).toHaveLength(2);
    expect(edge(diagram, 'A', 'B').symbols).toEqual(['x', 'y']);
    expect(edge(diagram, 'A', 'B').label).toBe('x, y');
  });

  it('draws a self-loop as an arc above the node, with room for it above the diagram', () => {
    const diagram = dfaDiagram(dfa({ A: { a: 'A', b: 'B' }, B: {} }), []);
    const a = node(diagram, 'A');
    const loop = edge(diagram, 'A', 'A');

    expect(loop.path).toMatch(/^M [\d.]+ [\d.]+ C /);
    expect(loop.labelX).toBe(a.x);
    expect(loop.labelY).toBeLessThan(a.y - diagram.radius);
    expect(loop.labelY).toBeGreaterThan(0);
    expect(a.y - diagram.radius).toBeGreaterThan(30);
  });

  it('bows a backward edge above the diagram and the forward edge it pairs with straight, so they do not overlap', () => {
    const diagram = dfaDiagram(dfa({ A: { a: 'B' }, B: { b: 'A' } }), []);
    const forward = edge(diagram, 'A', 'B');
    const backward = edge(diagram, 'B', 'A');
    const a = node(diagram, 'A');

    expect(forward.path).toContain(' L ');
    expect(backward.path).toContain(' C ');
    expect(backward.labelY).toBeLessThan(a.y - diagram.radius);
    expect(backward.labelY).toBeGreaterThan(0);
    expect(backward.labelX).toBeCloseTo((a.x + node(diagram, 'B').x) / 2);
  });

  it('bows the two edges of a two-way pair inside one layer to opposite sides, so they do not overlap', () => {
    // B and C share a layer: B -> C goes down the column (right side), C -> B goes up (left side).
    const diagram = dfaDiagram(dfa({ A: { a: 'B', c: 'C' }, B: { b: 'C' }, C: { d: 'B' } }), []);
    const down = edge(diagram, 'B', 'C');
    const up = edge(diagram, 'C', 'B');
    const column = node(diagram, 'B').x;

    expect(node(diagram, 'C').x).toBe(column);
    expect(down.labelX).toBeGreaterThan(column + diagram.radius);
    expect(up.labelX).toBeLessThan(column - diagram.radius);
    expect(up.labelX).toBeGreaterThan(0);
    expect(down.labelX).toBeLessThan(diagram.width);
  });

  it('puts states the start cannot reach in one final extra layer', () => {
    const diagram = dfaDiagram(dfa({ A: { a: 'B' }, B: {}, X: { x: 'Y' }, Y: {} }, { start_state: 'A' }), []);

    expect(node(diagram, 'X').x).toBe(node(diagram, 'Y').x);
    expect(node(diagram, 'X').x).toBeGreaterThan(node(diagram, 'B').x);
    expect(diagram.nodes).toHaveLength(4);
    expect(diagram.edges).toHaveLength(2);
    // X -> Y stays inside the extra layer's column, so it is a same-layer curve beside the nodes.
    expect(edge(diagram, 'X', 'Y').path).toContain(' C ');
    expect(diagram.width).toBeGreaterThan(node(diagram, 'Y').x + diagram.radius);
  });

  it('flags the states and edges of a valid loop on the real loop fixture', () => {
    const diagram = dfaDiagram(VALID_LOOP_RESULT.formal_analysis.dfa, VALID_LOOP_RESULT.formal_analysis.diagnostics.valid_loops);

    expect(diagram.nodes.map((n) => [n.state, n.loop])).toEqual([
      ['D0', null],
      ['D1', null],
      ['D2', 'valid'],
      ['D3', null],
      ['D4', 'valid'],
    ]);
    expect(diagram.edges).toHaveLength(5);
    expect(edge(diagram, 'D2', 'D4').loop).toBe('valid');
    expect(edge(diagram, 'D4', 'D2').loop).toBe('valid');
    expect(edge(diagram, 'D1', 'D2').loop).toBeNull();
    expect(edge(diagram, 'D2', 'D3').loop).toBeNull();
    // D2 and D4 are in the same layer-step as D3; D4 -> D2 returns to an earlier layer, above the nodes.
    expect(edge(diagram, 'D4', 'D2').path).toContain(' C ');
    expect(edge(diagram, 'D4', 'D2').labelY).toBeLessThan(node(diagram, 'D2').y - diagram.radius);
  });

  it('lets an infinite loop win over a valid one, and needs the symbol to be an activity of the finding', () => {
    const machine = dfa({ A: { a: 'B' }, B: { b: 'A', c: 'B' } });
    const finding = (type: string, activities: string[]): LoopFinding => ({ type, dfa_states: ['A', 'B'], activities, message: '' });
    const diagram = dfaDiagram(machine, [finding('VALID_LOOP', ['a', 'b', 'c']), finding('INFINITE_LOOP_TRAP', ['a', 'b'])]);

    expect(node(diagram, 'A').loop).toBe('infinite');
    expect(edge(diagram, 'A', 'B').loop).toBe('infinite');
    expect(edge(diagram, 'B', 'A').loop).toBe('infinite');
    expect(edge(diagram, 'B', 'B').loop).toBe('valid');

    const partial = dfaDiagram(machine, [finding('VALID_LOOP', ['b'])]);
    expect(edge(partial, 'A', 'B').loop).toBeNull();
    expect(edge(partial, 'B', 'A').loop).toBe('valid');
  });

  it('returns an empty diagram for a DFA without states', () => {
    const diagram = dfaDiagram({ states: [], alphabet: [], start_state: '', accept_states: [], transitions: {}, state_subsets: {} }, []);

    expect(diagram.nodes).toEqual([]);
    expect(diagram.edges).toEqual([]);
    expect(diagram.entry).toBeNull();
  });
});
