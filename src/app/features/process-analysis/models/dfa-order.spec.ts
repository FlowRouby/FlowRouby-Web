import type { Dfa } from '../../../core/models/compile-result';
import { LOOP_RESULT, XOR_RESULT } from '../../../core/testing/compile-fixtures';
import { flowOrder } from './dfa-order';

const dfa = (partial: Partial<Dfa>): Dfa => ({
  states: [],
  alphabet: [],
  start_state: 'D0',
  accept_states: [],
  transitions: {},
  state_subsets: {},
  ...partial,
});

describe('flowOrder', () => {
  it('orders the symbols as the process flows instead of alphabetically', () => {
    expect(flowOrder(XOR_RESULT.formal_analysis.dfa)).toEqual({
      states: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6'],
      alphabet: ['start_1', 'task_1', 'task_2', 'task_3', 'end_1', 'end_2'],
    });
  });

  it('orders the states by distance from the start state', () => {
    const order = flowOrder(
      dfa({
        states: ['A', 'B', 'C'],
        alphabet: ['x', 'y'],
        start_state: 'C',
        transitions: { C: { y: 'A' }, A: { x: 'B' } },
      }),
    );

    expect(order).toEqual({ states: ['C', 'A', 'B'], alphabet: ['y', 'x'] });
  });

  it('visits each state once when the automaton has a cycle', () => {
    const order = flowOrder(
      dfa({
        states: ['D0', 'D1'],
        alphabet: ['a', 'b'],
        transitions: { D0: { b: 'D1' }, D1: { a: 'D0' } },
      }),
    );

    expect(order).toEqual({ states: ['D0', 'D1'], alphabet: ['b', 'a'] });
  });

  it('keeps unreachable states and unused symbols, after the reachable ones', () => {
    const order = flowOrder(
      dfa({
        states: ['D0', 'D1', 'D2'],
        alphabet: ['a', 'b', 'c'],
        transitions: { D0: { c: 'D2' }, D1: { a: 'D0' } },
      }),
    );

    expect(order).toEqual({ states: ['D0', 'D2', 'D1'], alphabet: ['c', 'a', 'b'] });
  });

  it('never drops or duplicates a state or a symbol of a real payload', () => {
    const source = LOOP_RESULT.formal_analysis.dfa;
    const order = flowOrder(source);

    expect([...order.states].sort()).toEqual([...source.states].sort());
    expect([...order.alphabet].sort()).toEqual([...source.alphabet].sort());
  });

  it('falls back to the backend order when the start state is not listed', () => {
    const order = flowOrder(dfa({ states: ['D1'], alphabet: ['b', 'a'], start_state: 'D9' }));

    expect(order).toEqual({ states: ['D1'], alphabet: ['b', 'a'] });
  });
});
