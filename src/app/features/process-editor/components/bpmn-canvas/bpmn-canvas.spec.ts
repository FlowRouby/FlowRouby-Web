import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BpmnCanvas } from './bpmn-canvas';

describe('BpmnCanvas', () => {
  let component: BpmnCanvas;
  let fixture: ComponentFixture<BpmnCanvas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BpmnCanvas],
    }).compileComponents();

    fixture = TestBed.createComponent(BpmnCanvas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
