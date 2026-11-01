import { TestBed } from '@angular/core/testing';
import { BpmnModeler } from '../../services/bpmn-modeler';
import { BpmnCanvas } from './bpmn-canvas';

describe('BpmnCanvas', () => {
  const modeler = { attach: vi.fn(), destroy: vi.fn() };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BpmnCanvas],
      providers: [{ provide: BpmnModeler, useValue: modeler }],
    }).compileComponents();
  });

  it('attaches the modeler to its container and destroys it with the component', async () => {
    const fixture = TestBed.createComponent(BpmnCanvas);
    await fixture.whenStable();
    expect(modeler.attach).toHaveBeenCalledWith(fixture.nativeElement.querySelector('div'));

    fixture.destroy();
    expect(modeler.destroy).toHaveBeenCalled();
  });
});
