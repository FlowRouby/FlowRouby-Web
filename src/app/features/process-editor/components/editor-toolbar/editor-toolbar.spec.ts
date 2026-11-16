import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import type { ApiError } from '../../../../core/models/api-error';
import type { SampleProcess } from '../../../../core/models/sample-process';
import { SampleApi } from '../../../../core/services/sample-api';
import { ImportAnalysis } from '../../../process-analysis/services/import-analysis';
import { BpmnModeler } from '../../services/bpmn-modeler';
import { EditorToolbar } from './editor-toolbar';

const SAMPLES: SampleProcess[] = [
  { id: '01-secuencial', filename: '01-secuencial.bpmn', name: 'Revisión de formulario', process_id: 'Process_Secuencial' },
  { id: '02-decision-xor', filename: '02-decision-xor.bpmn', name: 'Decisión', process_id: 'Process_Xor' },
];

describe('EditorToolbar', () => {
  let fixture: ComponentFixture<EditorToolbar>;
  const modeler = { importXml: vi.fn(), exportXml: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn(), zoomFit: vi.fn() };
  const analysis = { check: vi.fn() };
  const sampleApi = { list: vi.fn(), xml: vi.fn() };

  const create = async () => {
    fixture = TestBed.createComponent(EditorToolbar);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    modeler.importXml.mockResolvedValue(undefined);
    analysis.check.mockResolvedValue(undefined);
    sampleApi.list.mockReturnValue(of(SAMPLES));
    await TestBed.configureTestingModule({
      imports: [EditorToolbar],
      providers: [
        { provide: BpmnModeler, useValue: modeler },
        { provide: ImportAnalysis, useValue: analysis },
        { provide: SampleApi, useValue: sampleApi },
      ],
    }).compileComponents();
  });

  const root = () => fixture.nativeElement as HTMLElement;
  const select = () => root().querySelector<HTMLSelectElement>('select[aria-label="Diagramas de ejemplo"]')!;
  const alert = () => root().querySelector('[role="alert"]');
  const retryButton = () => [...root().querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Reintentar');

  const importFile = async (file: File) => {
    const input = root().querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(analysis.check).toHaveBeenCalled());
  };

  const choose = (id: string) => {
    select().value = id;
    select().dispatchEvent(new Event('change'));
  };

  const file = new File(['<definitions/>'], 'demo.bpmn');

  describe('file import', () => {
    beforeEach(create);

    it('accepts .bpmn and .xml files', () => {
      const input = root().querySelector('input[type="file"]')!;
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

  describe('sample catalog', () => {
    it('lists the catalog entries by name after a placeholder', async () => {
      await create();
      fixture.detectChanges();

      const options = [...select().options].map((option) => option.textContent?.trim());
      expect(options).toEqual(['Diagramas de ejemplo…', 'Revisión de formulario', 'Decisión']);
      expect(select().disabled).toBe(false);
      expect(sampleApi.list).toHaveBeenCalledTimes(1);
    });

    it('keeps the select disabled while the catalog loads', async () => {
      const pending = new Subject<SampleProcess[]>();
      sampleApi.list.mockReturnValue(pending);
      await create();
      fixture.detectChanges();

      expect(select().disabled).toBe(true);

      pending.next(SAMPLES);
      pending.complete();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(select().disabled).toBe(false);
    });

    it('disables the select without an error hint when the catalog is empty', async () => {
      sampleApi.list.mockReturnValue(of([]));
      await create();
      fixture.detectChanges();

      expect(select().disabled).toBe(true);
      expect(root().textContent).not.toContain('No se pudieron cargar los ejemplos.');
      expect(retryButton()).toBeUndefined();
    });

    it('shows a hint and a retry button when the catalog fails, and retry requests it again', async () => {
      const error: ApiError = { kind: 'network', status: 0 };
      sampleApi.list.mockReturnValue(throwError(() => error));
      await create();
      fixture.detectChanges();

      expect(select().disabled).toBe(true);
      expect(root().textContent).toContain('No se pudieron cargar los ejemplos.');

      sampleApi.list.mockReturnValue(of(SAMPLES));
      retryButton()!.click();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(sampleApi.list).toHaveBeenCalledTimes(2);
      expect(select().disabled).toBe(false);
      expect(select().options).toHaveLength(3);
      expect(root().textContent).not.toContain('No se pudieron cargar los ejemplos.');
      expect(retryButton()).toBeUndefined();
    });
  });

  describe('choosing a sample', () => {
    beforeEach(async () => {
      await create();
      fixture.detectChanges();
    });

    it('imports the XML into the modeler and sends a file named after the sample to the backend', async () => {
      sampleApi.xml.mockReturnValue(of('<sample/>'));
      choose('01-secuencial');
      await vi.waitFor(() => expect(analysis.check).toHaveBeenCalled());

      expect(sampleApi.xml).toHaveBeenCalledWith('01-secuencial');
      expect(modeler.importXml).toHaveBeenCalledWith('<sample/>');
      const sent = analysis.check.mock.calls[0][0] as File;
      expect(sent.name).toBe('01-secuencial.bpmn');
      expect(await sent.text()).toBe('<sample/>');
    });

    it('returns the select to the placeholder after loading', async () => {
      sampleApi.xml.mockReturnValue(of('<sample/>'));
      choose('02-decision-xor');
      await vi.waitFor(() => expect(analysis.check).toHaveBeenCalled());
      await fixture.whenStable();
      fixture.detectChanges();

      expect(select().value).toBe('');
      expect(select().disabled).toBe(false);
    });

    it('still calls the backend when the canvas cannot render the sample', async () => {
      sampleApi.xml.mockReturnValue(of('<sample/>'));
      modeler.importXml.mockRejectedValue(new Error('bad diagram'));
      choose('01-secuencial');

      await vi.waitFor(() => expect(analysis.check).toHaveBeenCalled());
    });

    it('disables the select while the XML is being fetched', async () => {
      const pending = new Subject<string>();
      sampleApi.xml.mockReturnValue(pending);
      choose('01-secuencial');
      fixture.detectChanges();

      expect(select().disabled).toBe(true);

      pending.next('<sample/>');
      pending.complete();
      await vi.waitFor(() => expect(analysis.check).toHaveBeenCalled());
      await fixture.whenStable();
      fixture.detectChanges();

      expect(select().disabled).toBe(false);
    });

    it('shows an alert and leaves the canvas untouched when the XML cannot be fetched', async () => {
      const error: ApiError = { kind: 'message', status: 404, detail: { message: 'nope' } };
      sampleApi.xml.mockReturnValue(throwError(() => error));
      choose('01-secuencial');
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(alert()).not.toBeNull();
      });

      expect(alert()!.textContent).toContain('No se pudo cargar el ejemplo.');
      expect(modeler.importXml).not.toHaveBeenCalled();
      expect(analysis.check).not.toHaveBeenCalled();
      expect(select().value).toBe('');
      expect(select().disabled).toBe(false);
    });

    it('clears the alert on the next successful load', async () => {
      sampleApi.xml.mockReturnValueOnce(throwError(() => ({ kind: 'network', status: 0 }) satisfies ApiError));
      choose('01-secuencial');
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(alert()).not.toBeNull();
      });

      sampleApi.xml.mockReturnValue(of('<sample/>'));
      choose('02-decision-xor');
      await vi.waitFor(() => expect(analysis.check).toHaveBeenCalled());
      await fixture.whenStable();
      fixture.detectChanges();

      expect(alert()).toBeNull();
    });

    it('ignores a stale response when another sample is chosen before it arrives', async () => {
      const first = new Subject<string>();
      const second = new Subject<string>();
      sampleApi.xml.mockReturnValueOnce(first).mockReturnValueOnce(second);

      choose('01-secuencial');
      choose('02-decision-xor');
      second.next('<second/>');
      second.complete();
      await vi.waitFor(() => expect(analysis.check).toHaveBeenCalledTimes(1));

      first.next('<first/>');
      first.complete();
      await fixture.whenStable();

      expect(modeler.importXml).toHaveBeenCalledTimes(1);
      expect(modeler.importXml).toHaveBeenCalledWith('<second/>');
      expect((analysis.check.mock.calls[0][0] as File).name).toBe('02-decision-xor.bpmn');
    });

    it('ignores a sample response that arrives after a file import', async () => {
      const pending = new Subject<string>();
      sampleApi.xml.mockReturnValue(pending);

      choose('01-secuencial');
      await importFile(file);
      pending.next('<late/>');
      pending.complete();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(modeler.importXml).toHaveBeenCalledTimes(1);
      expect(modeler.importXml).toHaveBeenCalledWith('<definitions/>');
      expect(analysis.check).toHaveBeenCalledTimes(1);
      expect(select().disabled).toBe(false);
    });
  });
});
