import { TestBed } from '@angular/core/testing';
import { ImportAnalysis } from '../../process-analysis/services/import-analysis';
import { BpmnModeler } from './bpmn-modeler';
import { DiagramLoader, SAVE_DEBOUNCE_MS } from './diagram-loader';
import { DiagramStorage } from './diagram-storage';

describe('DiagramLoader', () => {
  let loader: DiagramLoader;
  let editListener: () => void;
  let loadListener: () => void;
  const modeler = {
    importXml: vi.fn(),
    exportXml: vi.fn(),
    clear: vi.fn(),
    onEdited: vi.fn(),
    onLoad: vi.fn(),
  };
  const analysis = { check: vi.fn() };
  const storage = { save: vi.fn(), load: vi.fn(), clear: vi.fn() };

  const file = new File(['<definitions/>'], 'demo.bpmn');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    modeler.importXml.mockResolvedValue(undefined);
    modeler.exportXml.mockResolvedValue('<edited/>');
    modeler.clear.mockResolvedValue(undefined);
    modeler.onEdited.mockImplementation((listener: () => void) => (editListener = listener));
    modeler.onLoad.mockImplementation((listener: () => void) => (loadListener = listener));
    analysis.check.mockResolvedValue(undefined);
    storage.load.mockReturnValue(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: BpmnModeler, useValue: modeler },
        { provide: ImportAnalysis, useValue: analysis },
        { provide: DiagramStorage, useValue: storage },
      ],
    });
    loader = TestBed.inject(DiagramLoader);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('load', () => {
    it('renders the XML, saves it with the file name and sends the original file to the backend', async () => {
      const rendered = await loader.load('<definitions/>', file);

      expect(rendered).toBe(true);
      expect(modeler.importXml).toHaveBeenCalledWith('<definitions/>');
      expect(storage.save).toHaveBeenCalledWith({ xml: '<definitions/>', filename: 'demo.bpmn' });
      expect(analysis.check).toHaveBeenCalledWith(file);
    });

    it('still calls the backend, reports false and saves nothing when the canvas cannot render the XML', async () => {
      modeler.importXml.mockRejectedValue(new Error('bad diagram'));

      const rendered = await loader.load('<bad/>', file);

      expect(rendered).toBe(false);
      expect(storage.save).not.toHaveBeenCalled();
      expect(analysis.check).toHaveBeenCalledWith(file);
    });

    it('cancels a pending edit save, because loading replaces the diagram', async () => {
      editListener();
      loadListener();
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);

      expect(modeler.exportXml).not.toHaveBeenCalled();
      expect(storage.save).not.toHaveBeenCalled();
    });
  });

  describe('saving on edit', () => {
    it('exports and saves once, after the debounce, under the loaded file name', async () => {
      await loader.load('<definitions/>', file);
      storage.save.mockClear();

      editListener();
      editListener();
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS - 1);
      expect(storage.save).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(modeler.exportXml).toHaveBeenCalledTimes(1);
      expect(storage.save).toHaveBeenCalledTimes(1);
      expect(storage.save).toHaveBeenCalledWith({ xml: '<edited/>', filename: 'demo.bpmn' });
    });

    it('restarts the wait on every edit', async () => {
      editListener();
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS - 100);
      editListener();
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS - 100);
      expect(storage.save).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(100);
      expect(storage.save).toHaveBeenCalledTimes(1);
    });

    it('uses the default file name when no file was loaded', async () => {
      editListener();
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);

      expect(storage.save).toHaveBeenCalledWith({ xml: '<edited/>', filename: 'diagram.bpmn' });
    });

    it('drops a save whose export was overtaken by a load', async () => {
      let finishExport!: (xml: string) => void;
      modeler.exportXml.mockReturnValue(new Promise<string>((resolve) => (finishExport = resolve)));
      editListener();
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);

      loadListener();
      finishExport('<old/>');
      await vi.advanceTimersByTimeAsync(0);

      expect(storage.save).not.toHaveBeenCalled();
    });

    it('saves nothing when the export fails', async () => {
      modeler.exportXml.mockRejectedValue(new Error('export failed'));
      editListener();
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);

      expect(storage.save).not.toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('does nothing when there is no stored diagram', async () => {
      await loader.restore();

      expect(modeler.importXml).not.toHaveBeenCalled();
      expect(analysis.check).not.toHaveBeenCalled();
    });

    it('loads the stored diagram through the normal path and analyses it like an imported file', async () => {
      storage.load.mockReturnValue({ xml: '<stored/>', filename: 'kept.bpmn' });

      await loader.restore();

      expect(modeler.importXml).toHaveBeenCalledWith('<stored/>');
      const sent = analysis.check.mock.calls[0][0] as File;
      expect(sent.name).toBe('kept.bpmn');
      expect(await sent.text()).toBe('<stored/>');
      expect(storage.clear).not.toHaveBeenCalled();
      expect(modeler.clear).not.toHaveBeenCalled();
    });

    it('keeps the stored file name for later edit saves', async () => {
      storage.load.mockReturnValue({ xml: '<stored/>', filename: 'kept.bpmn' });
      await loader.restore();

      editListener();
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);

      expect(storage.save).toHaveBeenLastCalledWith({ xml: '<edited/>', filename: 'kept.bpmn' });
    });

    it('forgets a stored diagram the canvas cannot render and leaves the empty diagram', async () => {
      storage.load.mockReturnValue({ xml: '<broken/>', filename: 'kept.bpmn' });
      modeler.importXml.mockRejectedValue(new Error('bad diagram'));

      await loader.restore();

      expect(storage.save).not.toHaveBeenCalled();
      expect(storage.clear).toHaveBeenCalledTimes(1);
      expect(modeler.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('forgets the stored diagram, cancels a pending save and empties the canvas', async () => {
      editListener();

      await loader.clear();
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);

      expect(storage.clear).toHaveBeenCalledTimes(1);
      expect(modeler.clear).toHaveBeenCalledTimes(1);
      expect(modeler.exportXml).not.toHaveBeenCalled();
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('goes back to the default file name', async () => {
      await loader.load('<definitions/>', file);
      await loader.clear();

      editListener();
      await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);

      expect(storage.save).toHaveBeenLastCalledWith({ xml: '<edited/>', filename: 'diagram.bpmn' });
    });
  });
});
