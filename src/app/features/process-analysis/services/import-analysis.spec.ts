import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import type { ApiError } from '../../../core/models/api-error';
import type { Diagnostic } from '../../../core/models/diagnostic';
import type { ImportResult } from '../../../core/models/import-result';
import { ProcessApi } from '../../../core/services/process-api';
import { BpmnModeler } from '../../process-editor/services/bpmn-modeler';
import { ImportAnalysis } from './import-analysis';

const diagnostic = (severity: Diagnostic['severity'], elementId: string | null): Diagnostic => ({
  severity,
  code: 'UNSUPPORTED_ELEMENT',
  message: 'raw',
  elementId,
  elementType: 'subProcess',
  processId: 'P',
  blocksAnalysis: severity === 'warning',
  line: 5,
});

const ok = (supported: boolean, diagnostics: Diagnostic[] = []) =>
  ({ supported, diagnostics, document: {} }) as unknown as ImportResult;

describe('ImportAnalysis', () => {
  let edited: () => void;
  const modeler = { onEdited: vi.fn(), applyMarkers: vi.fn(), exportXml: vi.fn() };
  const api = { importProcess: vi.fn() };
  let analysis: ImportAnalysis;
  const file = new File(['<x/>'], 'a.bpmn');

  beforeEach(() => {
    vi.resetAllMocks();
    modeler.onEdited.mockImplementation((listener: () => void) => (edited = listener));
    TestBed.configureTestingModule({
      providers: [
        { provide: BpmnModeler, useValue: modeler },
        { provide: ProcessApi, useValue: api },
      ],
    });
    analysis = TestBed.inject(ImportAnalysis);
  });

  /** Starts a check whose response the test controls. */
  const start = () => {
    const stream = new Subject<ImportResult>();
    api.importProcess.mockReturnValueOnce(stream);
    return { stream, done: analysis.check(file) };
  };
  const respond = (stream: Subject<ImportResult>, value: ImportResult) => {
    stream.next(value);
    stream.complete();
  };

  it('starts idle and unsupported', () => {
    expect(analysis.status()).toBe('idle');
    expect(analysis.supported()).toBe(false);
  });

  it('stores the diagnostics and supported flag of a 200 and marks the canvas', async () => {
    const diagnostics = [diagnostic('warning', 'Sub'), diagnostic('info', null)];
    const { stream, done } = start();
    expect(analysis.status()).toBe('loading');
    respond(stream, ok(true, diagnostics));
    await done;

    expect(api.importProcess).toHaveBeenCalledWith(file);
    expect(analysis.status()).toBe('loaded');
    expect(analysis.supported()).toBe(true);
    expect(analysis.diagnostics()).toEqual(diagnostics);
    expect(modeler.applyMarkers).toHaveBeenLastCalledWith(new Map([['Sub', 'fr-warning']]));
  });

  it('reads supported false from a 200', async () => {
    const { stream, done } = start();
    respond(stream, ok(false, [diagnostic('warning', 'Sub')]));
    await done;

    expect(analysis.supported()).toBe(false);
    expect(analysis.rejected()).toBe(false);
  });

  it('shows the diagnostics of a 422 and is never supported', async () => {
    const error: ApiError = { kind: 'diagnostics', status: 422, message: null, diagnostics: [diagnostic('error', null)] };
    const { stream, done } = start();
    stream.error(error);
    await done;

    expect(analysis.status()).toBe('loaded');
    expect(analysis.supported()).toBe(false);
    expect(analysis.rejected()).toBe(true);
    expect(analysis.diagnostics()).toEqual(error.diagnostics);
    expect(analysis.failure()).toBeNull();
  });

  it.each<ApiError>([
    { kind: 'network', status: 0 },
    { kind: 'validation', status: 422, issues: [] },
    { kind: 'message', status: 422, detail: {} },
    { kind: 'unknown', status: 500 },
  ])('keeps the failure and no diagnostics for kind $kind', async (error) => {
    const { stream, done } = start();
    stream.error(error);
    await done;

    expect(analysis.status()).toBe('failed');
    expect(analysis.failure()).toEqual(error);
    expect(analysis.diagnostics()).toEqual([]);
    expect(analysis.supported()).toBe(false);
  });

  it('turns a non-ApiError throw into an unknown failure', async () => {
    const { stream, done } = start();
    stream.error(new Error('boom'));
    await done;

    expect(analysis.failure()).toEqual({ kind: 'unknown', status: 0 });
  });

  it('turns stale on an edit, reads unsupported meanwhile, and re-checks the exported diagram as diagram.bpmn', async () => {
    const first = start();
    respond(first.stream, ok(true));
    await first.done;

    edited();
    expect(analysis.stale()).toBe(true);
    expect(analysis.supported()).toBe(false);

    modeler.exportXml.mockResolvedValue('<edited/>');
    const second = new Subject<ImportResult>();
    api.importProcess.mockReturnValueOnce(second);
    const rechecking = analysis.recheck();
    await vi.waitFor(() => expect(api.importProcess).toHaveBeenCalledTimes(2));
    const sent = api.importProcess.mock.calls[1][0] as File;
    expect(sent.name).toBe('diagram.bpmn');
    expect(await sent.text()).toBe('<edited/>');
    respond(second, ok(true));
    await rechecking;

    expect(analysis.stale()).toBe(false);
    expect(analysis.supported()).toBe(true);
  });

  it('ignores edits before any import', () => {
    edited();
    expect(analysis.stale()).toBe(false);
  });

  it('importing a new file resets the stale flag and the previous result', async () => {
    const first = start();
    respond(first.stream, ok(true, [diagnostic('warning', 'A')]));
    await first.done;
    edited();

    const second = start();
    expect(analysis.stale()).toBe(false);
    expect(analysis.diagnostics()).toEqual([]);
    expect(modeler.applyMarkers).toHaveBeenLastCalledWith(new Map());
    respond(second.stream, ok(true));
    await second.done;
  });

  it('ignores a slow earlier response that arrives after a newer one', async () => {
    const slow = start();
    const fast = start();
    respond(fast.stream, ok(true, [diagnostic('info', 'New')]));
    await fast.done;
    respond(slow.stream, ok(false, [diagnostic('warning', 'Old')]));
    await slow.done;

    expect(analysis.diagnostics().map((d) => d.elementId)).toEqual(['New']);
    expect(analysis.supported()).toBe(true);
  });

  it('reports a failure when the current diagram cannot be exported', async () => {
    modeler.exportXml.mockRejectedValue(new Error('no'));
    await analysis.recheck();

    expect(analysis.status()).toBe('failed');
    expect(api.importProcess).not.toHaveBeenCalled();
  });
});
