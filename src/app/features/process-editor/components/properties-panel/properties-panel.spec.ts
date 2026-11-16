import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { SelectedElement } from '../../models/selected-element';
import { BpmnModeler } from '../../services/bpmn-modeler';
import { PropertiesPanel } from './properties-panel';

describe('PropertiesPanel', () => {
  const selection = signal<SelectedElement | null>(null);
  const modeler = {
    selection,
    updateName: vi.fn(),
    validateId: vi.fn<(id: string) => string | null>(),
    updateId: vi.fn<(id: string) => string | null>(),
  };

  const render = async () => {
    const fixture = TestBed.createComponent(PropertiesPanel);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const field = (id: string) => root.querySelector<HTMLInputElement>(`#${id}`)!;
    const type = async (id: string, value: string, event: 'input' | 'change') => {
      const input = field(id);
      input.value = value;
      input.dispatchEvent(new Event(event));
      await fixture.whenStable();
    };
    return { root, field, type };
  };

  beforeEach(async () => {
    selection.set({ id: 'Task_Register', type: 'bpmn:Task', name: 'Register' });
    vi.resetAllMocks();
    modeler.validateId.mockReturnValue(null);
    modeler.updateId.mockReturnValue(null);
    await TestBed.configureTestingModule({
      imports: [PropertiesPanel],
      providers: [{ provide: BpmnModeler, useValue: modeler }],
    }).compileComponents();
  });

  it('asks to select an element when nothing is selected', async () => {
    selection.set(null);
    expect((await render()).root.textContent).toContain('Seleccione un elemento');
  });

  it('shows the type, id and name of the selected element', async () => {
    const { root, field } = await render();

    expect(root.textContent).toContain('bpmn:Task');
    expect(field('element-id').value).toBe('Task_Register');
    expect(field('element-name').value).toBe('Register');
  });

  it('shows an empty name input when the element has no name', async () => {
    selection.set({ id: 'Flow_1', type: 'bpmn:SequenceFlow', name: undefined });
    expect((await render()).field('element-name').value).toBe('');
  });

  it('renames the selected element when the name is committed', async () => {
    const { type } = await render();
    await type('element-name', 'Register customer', 'change');

    expect(modeler.updateName).toHaveBeenCalledWith('Register customer');
  });

  it('applies a new id when committed', async () => {
    const { root, type } = await render();
    await type('element-id', 'Task_Signup', 'change');

    expect(modeler.updateId).toHaveBeenCalledWith('Task_Signup');
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows the validation error while typing an invalid id', async () => {
    modeler.validateId.mockReturnValue('El ID ya está en uso.');
    const { root, field, type } = await render();
    await type('element-id', 'Task_Taken', 'input');

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('ya está en uso');
    expect(field('element-id').getAttribute('aria-invalid')).toBe('true');
  });

  it('shows the error when committing an invalid id', async () => {
    modeler.updateId.mockReturnValue('El ID es obligatorio.');
    const { root, type } = await render();
    await type('element-id', '', 'change');

    expect(root.querySelector('[role="alert"]')?.textContent).toContain('obligatorio');
  });

  it('clears the error when the selection changes', async () => {
    modeler.validateId.mockReturnValue('El ID ya está en uso.');
    const { root, type } = await render();
    await type('element-id', 'Task_Taken', 'input');

    selection.set({ id: 'Task_Other', type: 'bpmn:Task', name: undefined });
    TestBed.tick();

    expect(root.querySelector('[role="alert"]')).toBeNull();
  });
});
