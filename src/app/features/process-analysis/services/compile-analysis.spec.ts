import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import type { ApiError } from '../../../core/models/api-error';
import type { CompileResult } from '../../../core/models/compile-result';
import { ProcessApi } from '../../../core/services/process-api';
import { XOR_RESULT } from '../../../core/testing/compile-fixtures';
import { BpmnModeler } from '../../process-editor/services/bpmn-modeler';
import { CompileAnalysis } from './compile-analysis';
import { ImportAnalysis, type ImportStatus } from './import-analysis';

describe('CompileAnalysis', () => {
  let edited: () => void;
  let loadStarted: () => void;
  const importStatus = signal<ImportStatus>('loaded');
  const supported = signal(true);
  const modeler = { onEdited: vi.fn(), onLoad: vi.fn(), exportXml: vi.fn() };
  const api = { compile: vi.fn(), downloadProject: vi.fn() };
  let compile: CompileAnalysis;

  const flush = () => new Promise((resolve) => setTimeout(resolve));

  beforeEach(() => {
    vi.resetAllMocks();
    importStatus.set('loaded');
    supported.set(true);
    modeler.onEdited.mockImplementation((listener: () => void) => (edited = listener));
    modeler.onLoad.mockImplementation((listener: () => void) => (loadStarted = listener));
    modeler.exportXml.mockResolvedValue('<definitions/>');
    TestBed.configureTestingModule({
      providers: [
        { provide: BpmnModeler, useValue: modeler },
        { provide: ProcessApi, useValue: api },
        { provide: ImportAnalysis, useValue: { status: importStatus, supported } },
      ],
    });
    compile = TestBed.inject(CompileAnalysis);
  });

  describe('compile', () => {
    it('sends the current canvas XML as diagram.bpmn and keeps the result', async () => {
      api.compile.mockReturnValue(of(XOR_RESULT));

      await compile.compile();

      const file = api.compile.mock.calls[0][0] as File;
      expect(file.name).toBe('diagram.bpmn');
      expect(await file.text()).toBe('<definitions/>');
      expect(compile.status()).toBe('loaded');
      expect(compile.result()).toBe(XOR_RESULT);
      expect(compile.bpmnIdOf('task_1')).toBe('Review');
      expect(compile.bpmnIdOf('nope')).toBeNull();
    });

    it.each<[string, ApiError]>([
      ['diagnostics', { kind: 'diagnostics', status: 422, message: null, diagnostics: [] }],
      ['message', { kind: 'message', status: 422, detail: { message: 'x', line: 1, column: 2, flowspec_code: 'c' } }],
      ['network', { kind: 'network', status: 0 }],
    ])('exposes a %s failure and no result', async (_name, error) => {
      api.compile.mockReturnValue(throwError(() => error));

      await compile.compile();

      expect(compile.status()).toBe('failed');
      expect(compile.failure()).toEqual(error);
      expect(compile.result()).toBeNull();
    });

    it('turns an unexpected throw into an unknown failure', async () => {
      api.compile.mockReturnValue(throwError(() => new Error('boom')));
      await compile.compile();
      expect(compile.failure()).toEqual({ kind: 'unknown', status: 0 });
    });

    it('fails without calling the API when the canvas cannot be exported', async () => {
      modeler.exportXml.mockRejectedValue(new Error('no canvas'));
      await compile.compile();
      expect(api.compile).not.toHaveBeenCalled();
      expect(compile.status()).toBe('failed');
    });

    it('is gated by supported', async () => {
      supported.set(false);
      expect(compile.canCompile()).toBe(false);
      expect(compile.canDownload()).toBe(false);

      await compile.compile();
      await compile.download();

      expect(api.compile).not.toHaveBeenCalled();
      expect(api.downloadProject).not.toHaveBeenCalled();
      expect(compile.status()).toBe('idle');
    });

    it('does not start a second compile while one is running', async () => {
      const pending = new Subject<CompileResult>();
      api.compile.mockReturnValue(pending);

      const first = compile.compile();
      await flush();
      expect(compile.canCompile()).toBe(false);
      await compile.compile();
      pending.next(XOR_RESULT);
      pending.complete();
      await first;

      expect(api.compile).toHaveBeenCalledTimes(1);
    });

    describe('discarding', () => {
      beforeEach(async () => {
        api.compile.mockReturnValue(of(XOR_RESULT));
        await compile.compile();
      });

      it('drops the result and its symbols when the diagram is edited', () => {
        edited();
        expect(compile.result()).toBeNull();
        expect(compile.status()).toBe('idle');
        expect(compile.bpmnIdOf('task_1')).toBeNull();
      });

      it('drops the result when a new import or check starts', () => {
        importStatus.set('loading');
        TestBed.tick();
        expect(compile.result()).toBeNull();
        expect(compile.status()).toBe('idle');
      });

      it('drops the result synchronously when a diagram load starts, before any import check', () => {
        loadStarted();
        expect(compile.result()).toBeNull();
        expect(compile.status()).toBe('idle');
        expect(compile.bpmnIdOf('task_1')).toBeNull();
      });

      it('drops a failure when a diagram load starts', async () => {
        api.compile.mockReturnValue(throwError(() => ({ kind: 'network', status: 0 })));
        await compile.compile();

        loadStarted();

        expect(compile.failure()).toBeNull();
        expect(compile.status()).toBe('idle');
      });

      it('drops a failure too', async () => {
        api.compile.mockReturnValue(throwError(() => ({ kind: 'network', status: 0 })));
        await compile.compile();
        expect(compile.failure()).not.toBeNull();

        edited();

        expect(compile.failure()).toBeNull();
      });

      it('drops the previous result as soon as a new compile starts', async () => {
        api.compile.mockReturnValue(new Subject());
        void compile.compile();
        await flush();
        expect(compile.result()).toBeNull();
        expect(compile.status()).toBe('loading');
      });
    });

    describe('out-of-order responses', () => {
      it('ignores a response for a diagram edited meanwhile', async () => {
        const pending = new Subject<CompileResult>();
        api.compile.mockReturnValue(pending);

        const running = compile.compile();
        await flush();
        edited();
        pending.next(XOR_RESULT);
        pending.complete();
        await running;

        expect(compile.result()).toBeNull();
        expect(compile.status()).toBe('idle');
      });

      it('ignores a response that arrives after a new import started', async () => {
        const pending = new Subject<CompileResult>();
        api.compile.mockReturnValue(pending);

        const running = compile.compile();
        await flush();
        supported.set(false);
        importStatus.set('loading');
        TestBed.tick();
        pending.next(XOR_RESULT);
        pending.complete();
        await running;

        expect(compile.result()).toBeNull();
      });

      it('ignores a response that arrives after a diagram load started', async () => {
        const pending = new Subject<CompileResult>();
        api.compile.mockReturnValue(pending);

        const running = compile.compile();
        await flush();
        loadStarted();
        pending.next(XOR_RESULT);
        pending.complete();
        await running;

        expect(compile.result()).toBeNull();
        expect(compile.status()).toBe('idle');
      });

      it('ignores a failure that arrives after a diagram load started', async () => {
        const pending = new Subject<CompileResult>();
        api.compile.mockReturnValue(pending);

        const running = compile.compile();
        await flush();
        loadStarted();
        pending.error({ kind: 'network', status: 0 });
        await running;

        expect(compile.failure()).toBeNull();
        expect(compile.status()).toBe('idle');
      });

      it('ignores a failure of an outdated request', async () => {
        const pending = new Subject<CompileResult>();
        api.compile.mockReturnValue(pending);

        const running = compile.compile();
        await flush();
        edited();
        pending.error({ kind: 'network', status: 0 });
        await running;

        expect(compile.failure()).toBeNull();
        expect(compile.status()).toBe('idle');
      });

      it('lets the newest request win over an older one finishing later', async () => {
        const older = new Subject<CompileResult>();
        const newer = new Subject<CompileResult>();
        api.compile.mockReturnValueOnce(older).mockReturnValueOnce(newer);

        const first = compile.compile();
        await flush();
        edited();
        const second = compile.compile();
        await flush();
        newer.next(XOR_RESULT);
        newer.complete();
        await second;
        older.next({ ...XOR_RESULT, bpmn_node_ids: {} });
        older.complete();
        await first;

        expect(compile.result()).toBe(XOR_RESULT);
      });
    });
  });

  describe('download', () => {
    let click: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      URL.createObjectURL = vi.fn(() => 'blob:project');
      URL.revokeObjectURL = vi.fn();
    });

    it('sends the current XML and saves the blob under the server file name', async () => {
      let downloaded = '';
      click.mockImplementationOnce(function (this: HTMLAnchorElement) {
        downloaded = this.download;
      });
      api.downloadProject.mockReturnValue(of({ blob: new Blob(['zip']), fileName: 'loan_rails.zip' }));

      await compile.download();

      expect((api.downloadProject.mock.calls[0][0] as File).name).toBe('diagram.bpmn');
      expect(downloaded).toBe('loan_rails.zip');
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(compile.downloading()).toBe(false);
      expect(compile.downloadFailure()).toBeNull();
    });

    it('prevents double submission while downloading', async () => {
      const pending = new Subject<{ blob: Blob; fileName: string }>();
      api.downloadProject.mockReturnValue(pending);

      const first = compile.download();
      await flush();
      expect(compile.downloading()).toBe(true);
      expect(compile.canDownload()).toBe(false);
      await compile.download();
      pending.next({ blob: new Blob(['zip']), fileName: 'a.zip' });
      pending.complete();
      await first;

      expect(api.downloadProject).toHaveBeenCalledTimes(1);
    });

    it.each<[string, () => void]>([
      ['the diagram is edited', () => edited()],
      ['a new diagram is loaded', () => loadStarted()],
    ])('does not report a download failure that arrives after %s', async (_name, change) => {
      const pending = new Subject<{ blob: Blob; fileName: string }>();
      api.downloadProject.mockReturnValue(pending);

      const running = compile.download();
      await flush();
      change();
      pending.error({ kind: 'network', status: 0 });
      await running;

      expect(compile.downloadFailure()).toBeNull();
      expect(compile.downloading()).toBe(false);
    });

    it.each<[string, () => void]>([
      ['an edit', () => edited()],
      ['a diagram load', () => loadStarted()],
    ])('clears a previous download failure on %s', async (_name, change) => {
      api.downloadProject.mockReturnValue(throwError(() => ({ kind: 'network', status: 0 })));
      await compile.download();
      expect(compile.downloadFailure()).not.toBeNull();

      change();

      expect(compile.downloadFailure()).toBeNull();
    });

    it('exposes the failure and saves nothing', async () => {
      api.downloadProject.mockReturnValue(throwError(() => ({ kind: 'network', status: 0 })));

      await compile.download();

      expect(compile.downloadFailure()).toEqual({ kind: 'network', status: 0 });
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(compile.downloading()).toBe(false);
    });
  });
});
