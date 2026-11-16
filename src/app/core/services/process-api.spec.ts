import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import type { ApiError } from '../models/api-error';
import type { ImportResult } from '../models/import-result';
import { XOR_RESULT } from '../testing/compile-fixtures';
import { INVALID_INPUT_DATA_BODY, SIMULATION_WITH_INPUT } from '../testing/simulation-fixtures';
import { ProcessApi } from './process-api';

const URL = `${environment.apiUrl}/api/v1/processes/import`;

const result: ImportResult = {
  supported: true,
  diagnostics: [],
  document: {
    definitionsId: 'Defs',
    name: null,
    targetNamespace: null,
    sourceLine: 2,
    participants: [],
    processes: [],
    extensions: { attributes: {}, elements: [] },
    unrecognized: [],
  },
};

describe('ProcessApi', () => {
  let api: ProcessApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ProcessApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const file = () => new File(['<definitions/>'], 'demo.bpmn', { type: 'text/xml' });

  it('posts a multipart body with a single file field and returns the typed 200', () => {
    let received: ImportResult | undefined;
    api.importProcess(file()).subscribe((value) => (received = value));

    const request = http.expectOne(URL);
    expect(request.request.method).toBe('POST');
    const body = request.request.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.getAll('file')).toHaveLength(1);
    expect((body.get('file') as File).name).toBe('demo.bpmn');

    request.flush(result);
    expect(received).toEqual(result);
  });

  it('emits a normalized error carrying the diagnostics of a 422', () => {
    let error: ApiError | undefined;
    api.importProcess(file()).subscribe({ error: (e: ApiError) => (error = e) });

    http.expectOne(URL).flush(
      { detail: { message: 'x', diagnostics: [{ code: 'NO_END_EVENT' }] } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    expect(error?.kind).toBe('diagnostics');
    expect(error?.status).toBe(422);
  });

  it('emits a network error when there is no response', () => {
    let error: ApiError | undefined;
    api.importProcess(file()).subscribe({ error: (e: ApiError) => (error = e) });

    http.expectOne(URL).error(new ProgressEvent('error'));

    expect(error).toEqual({ kind: 'network', status: 0 });
  });

  describe('compile', () => {
    const COMPILE_URL = `${environment.apiUrl}/api/v1/processes/compile`;

    it('posts the file as multipart and returns the typed 200', () => {
      let received: unknown;
      api.compile(file()).subscribe((value) => (received = value));

      const request = http.expectOne(COMPILE_URL);
      expect(request.request.method).toBe('POST');
      expect(request.request.params.keys()).toEqual([]);
      expect((request.request.body as FormData).getAll('file')).toHaveLength(1);
      request.flush(XOR_RESULT);

      expect(received).toEqual(XOR_RESULT);
    });

    it('normalizes a 422 with diagnostics', () => {
      let error: ApiError | undefined;
      api.compile(file()).subscribe({ error: (e: ApiError) => (error = e) });

      http.expectOne(COMPILE_URL).flush(
        { detail: { message: 'x', diagnostics: [{ code: 'NO_END_EVENT' }] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      expect(error?.kind).toBe('diagnostics');
    });

    it('keeps the position of a FlowSpec syntax error', () => {
      let error: ApiError | undefined;
      api.compile(file()).subscribe({ error: (e: ApiError) => (error = e) });

      http.expectOne(COMPILE_URL).flush(
        { detail: { message: 'bad', line: 4, column: 2, flowspec_code: 'x' } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      expect(error).toMatchObject({ kind: 'message', detail: { line: 4, column: 2 } });
    });
  });

  describe('simulate', () => {
    const SIMULATE_URL = `${environment.apiUrl}/api/v1/processes/simulate`;

    it('posts only the file when there is no input_data and returns the typed 200', () => {
      let received: unknown;
      api.simulate(file()).subscribe((value) => (received = value));

      const request = http.expectOne(SIMULATE_URL);
      expect(request.request.method).toBe('POST');
      const body = request.request.body as FormData;
      expect(body.getAll('file')).toHaveLength(1);
      expect(body.has('input_data')).toBe(false);
      request.flush(SIMULATION_WITH_INPUT);

      expect(received).toEqual(SIMULATION_WITH_INPUT);
    });

    it('sends input_data as a form field string when provided', () => {
      api.simulate(file(), '{"amount": 500}').subscribe();

      const body = http.expectOne(SIMULATE_URL).request.body as FormData;
      expect(body.get('input_data')).toBe('{"amount": 500}');
      expect(body.getAll('file')).toHaveLength(1);
    });

    it('normalizes the 422 of an invalid input_data as a message error', () => {
      let error: ApiError | undefined;
      api.simulate(file(), '[1]').subscribe({ error: (e: ApiError) => (error = e) });

      http.expectOne(SIMULATE_URL).flush(INVALID_INPUT_DATA_BODY, { status: 422, statusText: 'Unprocessable Entity' });

      expect(error).toMatchObject({ kind: 'message', status: 422 });
    });

    it('normalizes a 422 with diagnostics and a network failure', () => {
      const errors: ApiError[] = [];
      api.simulate(file()).subscribe({ error: (e: ApiError) => errors.push(e) });
      http.expectOne(SIMULATE_URL).flush(
        { detail: { message: 'x', diagnostics: [{ code: 'NO_END_EVENT' }] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      api.simulate(file()).subscribe({ error: (e: ApiError) => errors.push(e) });
      http.expectOne(SIMULATE_URL).error(new ProgressEvent('error'));

      expect(errors.map((e) => e.kind)).toEqual(['diagnostics', 'network']);
    });
  });

  describe('downloadProject', () => {
    const ZIP_URL = `${environment.apiUrl}/api/v1/processes/compile`;
    const zipRequest = () => http.expectOne((r) => r.url === ZIP_URL && r.params.get('format') === 'zip');

    it('requests the ZIP as a blob and reads the file name from Content-Disposition', () => {
      let received: { blob: Blob; fileName: string } | undefined;
      api.downloadProject(file()).subscribe((value) => (received = value));

      const request = zipRequest();
      expect(request.request.method).toBe('POST');
      expect(request.request.responseType).toBe('blob');
      expect((request.request.body as FormData).getAll('file')).toHaveLength(1);
      const blob = new Blob(['zip'], { type: 'application/zip' });
      request.flush(blob, { headers: { 'Content-Disposition': 'attachment; filename="loan_rails.zip"' } });

      expect(received?.fileName).toBe('loan_rails.zip');
      expect(received?.blob).toBeInstanceOf(Blob);
    });

    it.each<[string, string, string]>([
      ['a quoted filename', 'attachment; filename="loan_rails.zip"', 'loan_rails.zip'],
      ['an unquoted filename', 'attachment; filename=loan_rails.zip', 'loan_rails.zip'],
      ['only filename*', "attachment; filename*=UTF-8''pr%C3%A9stamo%20rails.zip", 'préstamo rails.zip'],
      ['both, preferring filename*', "attachment; filename=\"fallback.zip\"; filename*=UTF-8''real.zip", 'real.zip'],
      ['a malformed filename* and a plain filename', "attachment; filename*=UTF-8''%E0%A4%A; filename=\"plain.zip\"", 'plain.zip'],
    ])('reads the file name from %s', (_name, header, expected) => {
      let name: string | undefined;
      api.downloadProject(file()).subscribe((value) => (name = value.fileName));

      zipRequest().flush(new Blob(['zip']), { headers: { 'Content-Disposition': header } });

      expect(name).toBe(expected);
    });

    it('falls back to a default file name without Content-Disposition', () => {
      let name: string | undefined;
      api.downloadProject(file()).subscribe((value) => (name = value.fileName));

      zipRequest().flush(new Blob(['zip']));

      expect(name).toBe('project.zip');
    });

    it('parses the JSON error body of a failed blob request', async () => {
      let error: ApiError | undefined;
      api.downloadProject(file()).subscribe({ error: (e: ApiError) => (error = e) });

      const body = { detail: { message: 'x', diagnostics: [{ code: 'NO_END_EVENT' }] } };
      zipRequest().flush(new Blob([JSON.stringify(body)], { type: 'application/json' }), {
        status: 422,
        statusText: 'Unprocessable Entity',
      });

      await vi.waitFor(() => expect(error).toBeDefined());
      expect(error).toMatchObject({ kind: 'diagnostics', status: 422 });
    });

    it('treats a non-JSON error body as an unknown failure', async () => {
      let error: ApiError | undefined;
      api.downloadProject(file()).subscribe({ error: (e: ApiError) => (error = e) });

      zipRequest().flush(new Blob(['<html>']), { status: 500, statusText: 'Server Error' });

      await vi.waitFor(() => expect(error).toBeDefined());
      expect(error).toEqual({ kind: 'unknown', status: 500 });
    });

    it('emits a network error when there is no response', () => {
      let error: ApiError | undefined;
      api.downloadProject(file()).subscribe({ error: (e: ApiError) => (error = e) });

      zipRequest().error(new ProgressEvent('error'));

      return vi.waitFor(() => expect(error).toEqual({ kind: 'network', status: 0 }));
    });
  });
});
