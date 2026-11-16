import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportAnalysis } from '../../../process-analysis/services/import-analysis';
import { BpmnModeler } from '../../services/bpmn-modeler';
import { EditorToolbar } from './editor-toolbar';

describe('EditorToolbar', () => {
  let fixture: ComponentFixture<EditorToolbar>;
  const modeler = { importXml: vi.fn(), exportXml: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn(), zoomFit: vi.fn() };
  const analysis = { check: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    modeler.importXml.mockResolvedValue(undefined);
    analysis.check.mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [EditorToolbar],
      providers: [
        { provide: BpmnModeler, useValue: modeler },
        { provide: ImportAnalysis, useValue: analysis },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorToolbar);
    await fixture.whenStable();
  });

  const importFile = async (file: File) => {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(analysis.check).toHaveBeenCalled());
  };

  const file = new File(['<definitions/>'], 'demo.bpmn');

  it('accepts .bpmn and .xml files', () => {
    const input = (fixture.nativeElement as HTMLElement).querySelector('input[type="file"]')!;
    expect(input.getAttribute('accept')).toBe('.bpmn,.xml');
  });

  it('renders the file on the canvas and sends the original file to the backend', async () => {
    await importFile(file);

    expect(modeler.importXml).toHaveBeenCalledWith('<definitions/>');
    expect(analysis.check).toHaveBeenCalledWith(file);
  });

  it('still calls the backend when the canvas cannot render the file', async () => {
    modeler.importXml.mockRejectedValue(new Error('bad diagram'));
    await importFile(file);

    expect(analysis.check).toHaveBeenCalledWith(file);
  });
});
