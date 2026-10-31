import { TestBed } from '@angular/core/testing';
import { BpmnModeler } from './bpmn-modeler';

describe('BpmnModeler', () => {
  let service: BpmnModeler;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BpmnModeler);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
