import { validateElementId } from './element-id';

describe('validateElementId', () => {
  const free = () => false;

  it.each(['Task_Register', '_private', 'a', 'Flow-1', 'step.2', 'Aprobación_1'])('accepts %s', (id) => {
    expect(validateElementId(id, free)).toBeNull();
  });

  it('requires a value', () => {
    expect(validateElementId('', free)).toBe('El ID es obligatorio.');
  });

  it.each(['1Task', '-Task', 'my task', 'a:b', 'a/b', 'Task#1'])('rejects %s as an invalid NCName', (id) => {
    expect(validateElementId(id, free)).toContain('debe comenzar con una letra o un guion bajo');
  });

  it('rejects an id that is already taken', () => {
    expect(validateElementId('Task_1', (id) => id === 'Task_1')).toBe('El ID ya está en uso.');
  });
});
