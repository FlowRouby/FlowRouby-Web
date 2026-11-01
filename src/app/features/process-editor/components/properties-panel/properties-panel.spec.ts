import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { SelectedElement } from '../../models/selected-element';
import { BpmnModeler } from '../../services/bpmn-modeler';
import { PropertiesPanel } from './properties-panel';

describe('PropertiesPanel', () => {
  const selection = signal<SelectedElement | null>(null);
  const updateName = vi.fn();

  const render = async () => {
    const fixture = TestBed.createComponent(PropertiesPanel);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    selection.set(null);
    updateName.mockClear();
    await TestBed.configureTestingModule({
      imports: [PropertiesPanel],
      providers: [{ provide: BpmnModeler, useValue: { selection, updateName } }],
    }).compileComponents();
  });

  it('asks to select an element when nothing is selected', async () => {
    expect((await render()).textContent).toContain('Select an element');
  });

  it('shows the type, id and name of the selected element', async () => {
    selection.set({ id: 'Task_Register', type: 'bpmn:Task', name: 'Register' });
    const root = await render();

    expect(root.textContent).toContain('bpmn:Task');
    expect(root.textContent).toContain('Task_Register');
    expect(root.querySelector('input')?.value).toBe('Register');
  });

  it('shows an empty name input when the element has no name', async () => {
    selection.set({ id: 'Flow_1', type: 'bpmn:SequenceFlow', name: undefined });
    expect((await render()).querySelector('input')?.value).toBe('');
  });

  it('renames the selected element when the name is committed', async () => {
    selection.set({ id: 'Task_Register', type: 'bpmn:Task', name: 'Register' });
    const input = (await render()).querySelector('input') as HTMLInputElement;

    input.value = 'Register customer';
    input.dispatchEvent(new Event('change'));

    expect(updateName).toHaveBeenCalledWith('Register customer');
  });
});
