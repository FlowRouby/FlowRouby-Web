import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProcessEditor } from './process-editor';

describe('ProcessEditor', () => {
  let component: ProcessEditor;
  let fixture: ComponentFixture<ProcessEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
