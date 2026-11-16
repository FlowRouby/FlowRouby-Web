import { toCanvasId, toCanvasIds } from './symbol-nodes';

describe('symbol translation', () => {
  const map = { start_1: 'Start', task_1: 'Review', gone_1: 'Removed' };
  const onCanvas = (id: string) => id !== 'Removed';

  it('translates a mapped symbol present on the canvas', () => {
    expect(toCanvasId('task_1', map, onCanvas)).toBe('Review');
  });

  it('returns null for an unmapped symbol', () => {
    expect(toCanvasId('task_9', map, onCanvas)).toBeNull();
    expect(toCanvasId('toString', map, onCanvas)).toBeNull();
  });

  it('returns null when the mapped element is not on the canvas', () => {
    expect(toCanvasId('gone_1', map, onCanvas)).toBeNull();
  });

  it('returns null without a mapping', () => {
    expect(toCanvasId('task_1', null, onCanvas)).toBeNull();
  });

  it('keeps the order and skips what cannot be placed', () => {
    expect(toCanvasIds(['start_1', 'gone_1', 'nope', 'task_1'], map, onCanvas)).toEqual(['Start', 'Review']);
  });
});
