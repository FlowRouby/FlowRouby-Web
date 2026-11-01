import { validateElementId } from './element-id';

describe('validateElementId', () => {
  const free = () => false;

  it.each(['Task_Register', '_private', 'a', 'Flow-1', 'step.2', 'Aprobación_1'])('accepts %s', (id) => {
    expect(validateElementId(id, free)).toBeNull();
  });

  it('requires a value', () => {
    expect(validateElementId('', free)).toBe('ID is required.');
  });

  it.each(['1Task', '-Task', 'my task', 'a:b', 'a/b', 'Task#1'])('rejects %s as an invalid NCName', (id) => {
    expect(validateElementId(id, free)).toContain('must start with a letter or underscore');
  });

  it('rejects an id that is already taken', () => {
    expect(validateElementId('Task_1', (id) => id === 'Task_1')).toBe('ID is already in use.');
  });
});
