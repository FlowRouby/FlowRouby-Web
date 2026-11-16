import { parseTrace } from './trace-input';

describe('parseTrace', () => {
  it.each<[string, string, string[]]>([
    ['spaces', 'start_1 task_1 end_1', ['start_1', 'task_1', 'end_1']],
    ['commas', 'start_1,task_1, end_1', ['start_1', 'task_1', 'end_1']],
    ['arrows', 'start_1 → task_1 -> end_1', ['start_1', 'task_1', 'end_1']],
    ['arrows without spaces', 'start_1→task_1->end_1', ['start_1', 'task_1', 'end_1']],
    ['middle dots', 'start_1·task_1', ['start_1', 'task_1']],
    ['mixed and repeated separators', '  start_1 ,, → task_1\n\tend_1 , ', ['start_1', 'task_1', 'end_1']],
  ])('splits on %s', (_name, text, expected) => {
    expect(parseTrace(text)).toEqual(expected);
  });

  it('keeps hyphens and dots that are part of an id', () => {
    expect(parseTrace('Task-1 Task.2')).toEqual(['Task-1', 'Task.2']);
  });

  it.each(['', '   ', ' , → ,'])('treats %j as a valid empty trace', (text) => {
    expect(parseTrace(text)).toEqual([]);
  });
});
