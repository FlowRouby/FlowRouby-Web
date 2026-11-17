import { TestBed } from '@angular/core/testing';
import { BpmnModeler } from '../../services/bpmn-modeler';
import { PropertiesPanel } from './properties-panel';

describe('PropertiesPanel', () => {
  const modeler = { mountPropertiesPanel: vi.fn(), unmountPropertiesPanel: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    await TestBed.configureTestingModule({
      imports: [PropertiesPanel],
      providers: [{ provide: BpmnModeler, useValue: modeler }],
    }).compileComponents();
  });

  it('mounts the modeler properties panel into its own element once rendered', async () => {
    const fixture = TestBed.createComponent(PropertiesPanel);
    await fixture.whenStable();

    expect(modeler.mountPropertiesPanel).toHaveBeenCalledTimes(1);
    expect(modeler.mountPropertiesPanel).toHaveBeenCalledWith(fixture.nativeElement);
    expect(modeler.unmountPropertiesPanel).not.toHaveBeenCalled();
  });

  it('unmounts the panel when destroyed', async () => {
    const fixture = TestBed.createComponent(PropertiesPanel);
    await fixture.whenStable();

    fixture.destroy();

    expect(modeler.unmountPropertiesPanel).toHaveBeenCalledTimes(1);
  });
});
