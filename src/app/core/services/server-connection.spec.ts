import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SLOW_AFTER_MS, ServerConnection, serverConnectionInterceptor } from './server-connection';

describe('ServerConnection', () => {
  const BACKEND = `${environment.apiUrl}/api/v1/processes/samples`;
  let http: HttpClient;
  let backend: HttpTestingController;
  let connection: ServerConnection;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([serverConnectionInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    connection = TestBed.inject(ServerConnection);
  });

  afterEach(() => vi.useRealTimers());

  it('is not slow while a backend request answers quickly', () => {
    http.get(BACKEND).subscribe();
    vi.advanceTimersByTime(SLOW_AFTER_MS - 1);
    backend.expectOne(BACKEND).flush([]);
    vi.advanceTimersByTime(SLOW_AFTER_MS);

    expect(connection.slow()).toBe(false);
  });

  it('becomes slow when a backend request stays unanswered, and recovers when it answers', () => {
    http.get(BACKEND).subscribe();
    vi.advanceTimersByTime(SLOW_AFTER_MS);
    expect(connection.slow()).toBe(true);

    backend.expectOne(BACKEND).flush([]);
    expect(connection.slow()).toBe(false);
  });

  it('recovers when the request fails', () => {
    http.get(BACKEND).subscribe({ error: () => undefined });
    vi.advanceTimersByTime(SLOW_AFTER_MS);

    backend.expectOne(BACKEND).error(new ProgressEvent('error'));
    expect(connection.slow()).toBe(false);
  });

  it('stays slow until the last of several requests answers', () => {
    http.get(BACKEND).subscribe();
    http.get(`${BACKEND}/a`).subscribe();
    vi.advanceTimersByTime(SLOW_AFTER_MS);

    backend.expectOne(BACKEND).flush([]);
    expect(connection.slow()).toBe(true);
    backend.expectOne(`${BACKEND}/a`).flush({});
    expect(connection.slow()).toBe(false);
  });

  it('ignores requests to other hosts', () => {
    http.get('https://example.org/data').subscribe();
    vi.advanceTimersByTime(SLOW_AFTER_MS * 2);

    expect(connection.slow()).toBe(false);
    backend.expectOne('https://example.org/data').flush({});
  });
});
