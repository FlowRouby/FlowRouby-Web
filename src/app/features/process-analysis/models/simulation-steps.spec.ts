import type { StepLog } from '../../../core/models/simulation-result';
import { collapseRepeats } from './simulation-steps';

/** Builds numbered steps from node ids; `id!` marks a step that updates the context with its own number. */
const run = (...ids: string[]): StepLog[] =>
  ids.map((id, index) => {
    const changing = id.endsWith('!');
    return {
      step: index + 1,
      node_id: changing ? id.slice(0, -1) : id,
      name: id,
      kind: 'user_task',
      ...(changing ? { context_updates: { attempt: index } } : {}),
    };
  });

const shape = (steps: StepLog[]) =>
  collapseRepeats(steps).map((item) => (item.repeat ? `x${item.repeat.times}[${item.repeat.from}-${item.repeat.to}]` : item.step.node_id));

describe('collapseRepeats', () => {
  it('keeps a run without loops step by step', () => {
    expect(shape(run('start', 'a', 'b', 'end'))).toEqual(['start', 'a', 'b', 'end']);
    expect(collapseRepeats([])).toEqual([]);
  });

  it('keeps the first run of a loop and collapses the identical ones after it', () => {
    const steps = run('start', 'a', 'b', 'a', 'b', 'a', 'b', 'a', 'b', 'end');

    expect(shape(steps)).toEqual(['start', 'a', 'b', 'x3[4-9]', 'end']);
    expect(collapseRepeats(steps)[3].repeat).toEqual({ times: 3, length: 2, from: 4, to: 9 });
  });

  it('shows the steps of an unfinished last run after the collapsed ones', () => {
    // What the backend returns when it stops at its step limit in the middle of a loop.
    expect(shape(run('start', 'g', 'a', 'g', 'a', 'g', 'a', 'g'))).toEqual(['start', 'g', 'a', 'x2[4-7]', 'g']);
  });

  it('does not collapse a block that ran only twice', () => {
    expect(shape(run('start', 'a', 'b', 'a', 'b', 'end'))).toEqual(['start', 'a', 'b', 'a', 'b', 'end']);
  });

  it('does not collapse a loop whose data changes on each run', () => {
    expect(shape(run('a!', 'b', 'a!', 'b', 'a!', 'b'))).toEqual(['a', 'b', 'a', 'b', 'a', 'b']);
  });

  it('tells apart the same gateway choosing different targets', () => {
    const steps = run('g', 'g', 'g');
    steps[0].selected_targets = ['a'];
    steps[1].selected_targets = ['b'];
    steps[2].selected_targets = ['a'];

    expect(collapseRepeats(steps).every((item) => item.step !== undefined)).toBe(true);
  });

  it('collapses the 100 steps of a loop cut by the step limit into a handful of items', () => {
    const ids = ['start'];
    while (ids.length < 100) ids.push('gateway_in', 'review', 'gateway_out', 'fix');
    const steps = run(...ids.slice(0, 100));
    const items = collapseRepeats(steps);

    expect(items.length).toBeLessThan(10);
    const repeat = items.find((item) => item.repeat)!.repeat!;
    expect(repeat.length).toBe(4);
    expect(repeat.times).toBe(23);
    expect(repeat.to).toBeLessThanOrEqual(100);
  });
});
