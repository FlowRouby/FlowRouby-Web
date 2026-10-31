import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProcessAnalysis } from './process-analysis';

describe('ProcessAnalysis', () => {
  let component: ProcessAnalysis;
  let fixture: ComponentFixture<ProcessAnalysis>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessAnalysis],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessAnalysis);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
