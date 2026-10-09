/**
 * A stubbed `fetch` for the two service specs that need one.
 *
 * It is a stub rather than a mock of `Response`: the only three things `JsonFetchService`
 * reads are `ok`, `status` and `text()`, and building a real `Response` in jsdom brings in
 * a stream implementation that the deadline tests then have to fight.
 */

import { vi } from 'vitest';

export interface StubbedResponse {
  readonly status: number;
  readonly body: string;
}

/** A `Response`-shaped value carrying only what `JsonFetchService` reads. */
function responseLike(stub: StubbedResponse): Response {
  const partial = {
    ok: stub.status >= 200 && stub.status < 300,
    status: stub.status,
    text: () => Promise.resolve(stub.body),
  };
  // The three members above are the whole of the contract this service has with
  // `Response`; the cast is confined to this fixture so no production file carries one.
  return partial as unknown as Response;
}

/** Installs a `fetch` that answers every URL with the same body. */
export function stubFetchJson(value: unknown, status = 200): void {
  stubFetchResponse({ status, body: JSON.stringify(value) });
}

/** Installs a `fetch` that answers with a literal body — an HTML index, say. */
export function stubFetchResponse(stub: StubbedResponse): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(responseLike(stub))),
  );
}

/** Installs a `fetch` that rejects, as a DNS failure or an offline browser would. */
export function stubFetchTransportFailure(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
  );
}

/**
 * Installs a `fetch` that never answers until its signal aborts, which is how the FR-075
 * deadline is asserted without waiting ten real seconds.
 */
export function stubFetchNeverAnswers(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    ),
  );
}

/**
 * Installs a `fetch` that answers by **URL** rather than by call order, which is what the
 * routed catalog test needs: following a catalog link fetches the manifest and then the
 * survey config, and an order-based stub would silently pass if the two were swapped.
 *
 * An unlisted URL answers 404 with a JSON body, so a missing entry surfaces as the
 * `unreadable` outcome the application would really see rather than as a stub crash.
 */
export function stubFetchByUrl(bodies: Readonly<Record<string, unknown>>): {
  readonly calls: string[];
} {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      calls.push(url);
      const body = bodies[url];
      return Promise.resolve(
        responseLike(
          body === undefined
            ? { status: 404, body: '{"error":"not found"}' }
            : { status: 200, body: JSON.stringify(body) },
        ),
      );
    }),
  );
  return { calls };
}

/** Installs a `fetch` that answers a different body per URL, in call order. */
export function stubFetchSequence(stubs: readonly StubbedResponse[]): { readonly calls: string[] } {
  const calls: string[] = [];
  let index = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      calls.push(url);
      const stub = stubs[Math.min(index, stubs.length - 1)];
      index += 1;
      return Promise.resolve(responseLike(stub));
    }),
  );
  return { calls };
}
