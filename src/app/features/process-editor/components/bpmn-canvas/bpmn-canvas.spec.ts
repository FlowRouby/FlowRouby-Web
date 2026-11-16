import { TestBed } from '@angular/core/testing';
import { BpmnModeler } from '../../services/bpmn-modeler';
import { DiagramLoader } from '../../services/diagram-loader';
import { BpmnCanvas } from './bpmn-canvas';

describe('BpmnCanvas', () => {
  const modeler = { attach: vi.fn(), destroy: vi.fn() };
  const loader = { restore: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    await TestBed.configureTestingModule({
      imports: [BpmnCanvas],
      providers: [
        { provide: BpmnModeler, useValue: modeler },
        { provide: DiagramLoader, useValue: loader },
      ],
    }).compileComponents();
  });

  it('attaches the modeler to its container and destroys it with the component', async () => {
    const fixture = TestBed.createComponent(BpmnCanvas);
    await fixture.whenStable();
    expect(modeler.attach).toHaveBeenCalledWith(fixture.nativeElement.querySelector('div'));

    fixture.destroy();
    expect(modeler.destroy).toHaveBeenCalled();
  });

  it('restores the kept diagram once, only after the modeler is attached', async () => {
    let finishAttach!: () => void;
    modeler.attach.mockReturnValue(new Promise<void>((resolve) => (finishAttach = resolve)));
    const fixture = TestBed.createComponent(BpmnCanvas);
    await fixture.whenStable();

    expect(loader.restore).not.toHaveBeenCalled();

    finishAttach();
    await vi.waitFor(() => expect(loader.restore).toHaveBeenCalledTimes(1));
  });
});
