import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import type { ApiError } from '../models/api-error';
import type { SampleProcess } from '../models/sample-process';
import { SampleApi } from './sample-api';

const URL = `${environment.apiUrl}/api/v1/processes/samples`;

const samples: SampleProcess[] = [
  { id: '01-secuencial', filename: '01-secuencial.bpmn', name: 'Revisión de formulario', process_id: 'Process_Secuencial' },
  { id: '02-decision-xor', filename: '02-decision-xor.bpmn', name: 'Decisión', process_id: 'Process_Xor' },
];

describe('SampleApi', () => {
  let api: SampleApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(SampleApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the catalog unwrapping the samples field', () => {
    let received: SampleProcess[] | undefined;
    api.list().subscribe((value) => (received = value));

    const request = http.expectOne(URL);
    expect(request.request.method).toBe('GET');
    request.flush({ samples });

    expect(received).toEqual(samples);
  });

  it('emits a network error when the catalog is unreachable', () => {
    let error: ApiError | undefined;
    api.list().subscribe({ error: (e: ApiError) => (error = e) });

    http.expectOne(URL).error(new ProgressEvent('error'));

    expect(error).toEqual({ kind: 'network', status: 0 });
  });

  it('fetches the XML of a sample as text with the id URL-encoded', () => {
    let received: string | undefined;
    api.xml('a b/c').subscribe((value) => (received = value));

    const request = http.expectOne(`${URL}/a%20b%2Fc`);
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('text');
    request.flush('<definitions/>');

    expect(received).toBe('<definitions/>');
  });

  it('maps a 404 with a JSON body delivered as text to a message error', () => {
    let error: ApiError | undefined;
    api.xml('nope').subscribe({ error: (e: ApiError) => (error = e) });

    http
      .expectOne(`${URL}/nope`)
      .flush(JSON.stringify({ detail: { message: "Sample 'nope' was not found." } }), { status: 404, statusText: 'Not Found' });

    expect(error).toEqual({ kind: 'message', status: 404, detail: { message: "Sample 'nope' was not found." } });
  });

  it('maps a non-JSON error body to an unknown error keeping the status', () => {
    let error: ApiError | undefined;
    api.xml('x').subscribe({ error: (e: ApiError) => (error = e) });

    http.expectOne(`${URL}/x`).flush('Internal Server Error', { status: 500, statusText: 'Server Error' });

    expect(error).toEqual({ kind: 'unknown', status: 500 });
  });
});
