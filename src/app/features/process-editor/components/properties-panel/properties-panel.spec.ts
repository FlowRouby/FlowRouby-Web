import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { SelectedElement } from '../../models/selected-element';
import { BpmnModeler } from '../../services/bpmn-modeler';
import { PropertiesPanel } from './properties-panel';

describe('PropertiesPanel', () => {
  const selection = signal<SelectedElement | null>(null);

  const render = async () => {
    const fixture = TestBed.createComponent(PropertiesPanel);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    selection.set(null);
    await TestBed.configureTestingModule({
      imports: [PropertiesPanel],
      providers: [{ provide: BpmnModeler, useValue: { selection } }],
    }).compileComponents();
  });

  it('asks to select an element when nothing is selected', async () => {
    expect((await render()).textContent).toContain('Select an element');
  });

  it('shows the type, id and name of the selected element', async () => {
    selection.set({ id: 'Task_Register', type: 'bpmn:Task', name: 'Register' });
    const text = (await render()).textContent;

    expect(text).toContain('bpmn:Task');
    expect(text).toContain('Task_Register');
    expect(text).toContain('Register');
  });

  it('shows a dash when the element has no name', async () => {
    selection.set({ id: 'Flow_1', type: 'bpmn:SequenceFlow', name: undefined });
    expect((await render()).textContent).toContain('—');
  });
});
