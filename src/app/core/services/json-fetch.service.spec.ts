import { TestBed } from '@angular/core/testing';
import { JsonFetchService } from './json-fetch.service';
import { provideSurveyTimeouts } from './survey-timeouts';

let service: JsonFetchService;

function mockFetch() {
  (window as any).fetch = vi.fn();
}

describe('JsonFetchService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideSurveyTimeouts(), JsonFetchService] });
    service = TestBed.inject(JsonFetchService);
    mockFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return json for a successful JSON response', async () => {
    (window as any).fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"test": "data"}'),
      }),
    );
    const result = await service.fetchJson('/test.json');
    expect(result.outcome).toBe('json');
    expect(result.value).toEqual({ test: 'data' });
    expect(result.status).toBe(200);
  });

  it('should return unreadable for an HTML body under HTTP 200', async () => {
    (window as any).fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('<html><body>Hello</body></html>'),
      }),
    );
    const result = await service.fetchJson('/test.html');
    expect(result.outcome).toBe('unreadable');
    expect(result.status).toBe(200);
  });

  it('should return unreadable for a network throw with status null', async () => {
    (window as any).fetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')));
    const result = await service.fetchJson('/test.json');
    expect(result.outcome).toBe('unreadable');
    expect(result.status).toBeNull();
  });

  it('should return unreadable with status 404 for a 404 response', async () => {
    (window as any).fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      }),
    );
    const result = await service.fetchJson('/test.json');
    expect(result.outcome).toBe('unreadable');
    expect(result.status).toBe(404);
  });
});
