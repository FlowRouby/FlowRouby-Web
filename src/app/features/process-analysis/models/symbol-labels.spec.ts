import { symbolLabels } from './symbol-labels';

describe('symbolLabels', () => {
  const onCanvas = new Set(['Start', 'Review']);
  const hasElement = (id: string) => onCanvas.has(id);

  it('maps each canvas element to its symbol', () => {
    const labels = symbolLabels({ start_1: 'Start', task_1: 'Review' }, hasElement);

    expect([...labels]).toEqual([
      ['Start', 'start_1'],
      ['Review', 'task_1'],
    ]);
  });

  it('skips symbols whose element is not on the canvas', () => {
    const labels = symbolLabels({ start_1: 'Start', task_9: 'Gone' }, hasElement);

    expect([...labels.keys()]).toEqual(['Start']);
  });

  it('returns no labels without a mapping', () => {
    expect(symbolLabels(null, hasElement).size).toBe(0);
    expect(symbolLabels({}, hasElement).size).toBe(0);
  });
});
