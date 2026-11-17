import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { SLOW_AFTER_MS, ServerConnection } from './core/services/server-connection';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should render the router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('router-outlet')).toBeTruthy();
  });

  it('shows the connecting notice only while the server is slow to answer', async () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(App);
      const host = fixture.nativeElement as HTMLElement;
      const connection = TestBed.inject(ServerConnection);
      fixture.detectChanges();
      expect(host.querySelector('[role="status"]')).toBeNull();

      connection.begin();
      vi.advanceTimersByTime(SLOW_AFTER_MS);
      fixture.detectChanges();
      expect(host.querySelector('[role="status"]')?.textContent).toContain('Conectando con el servidor');

      connection.end();
      fixture.detectChanges();
      expect(host.querySelector('[role="status"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
