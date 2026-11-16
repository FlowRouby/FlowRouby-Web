import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import type { ApiError } from '../models/api-error';
import type { ImportResult } from '../models/import-result';
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
});
