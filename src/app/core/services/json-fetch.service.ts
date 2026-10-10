/**
 * The only `fetch()` call in the feature — T047, `plan.md` §4.2.
 *
 * Two non-obvious rules live here and nowhere else:
 *
 * - **The body decides, not the status** (FR-076). `outcome: 'json'` requires a body that
 *   `JSON.parse` accepted, so a 200 carrying the deployment's HTML index is `unreadable`.
 *   `status` is returned only so the caller can choose between F17 and F18, which share
 *   their respondent-facing wording.
 * - **An unanswered request is a failure** (FR-075). The deadline is an `AbortController`
 *   plus a `setTimeout`, *not* `AbortSignal.timeout()`, which Vitest's fake timers do not
 *   patch — and FR-075 has to be provable in milliseconds (research D10).
 *
 * Angular's `HttpClient` is deliberately not used: it rejects on a non-2xx status and
 * resolves on a 200 HTML body, the exact inversion of FR-076.
 */

import { Injectable } from '@angular/core';

export type JsonFetchResult =
  | { readonly outcome: 'json'; readonly value: unknown; readonly status: number }
  | { readonly outcome: 'unreadable'; readonly status: number | null }
  | { readonly outcome: 'timeout' };

@Injectable({ providedIn: 'root' })
export class JsonFetchService {
  /**
   * `deadlineMs` is passed rather than injected so that one service can hold both the
   * manifest and the config deadline, and so a test can state the deadline it asserts.
   * The value comes from `SURVEY_TIMEOUTS.fetchMs` at every call site.
   */
  async fetchJson(url: string, deadlineMs: number): Promise<JsonFetchResult> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, deadlineMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      const body = await response.text();

      try {
        // FR-076: the parse is what decides, for every status. A non-success status with
        // a parseable body is still `unreadable`, because the body is not the document
        // that was asked for.
        const value: unknown = JSON.parse(body);
        return response.ok
          ? { outcome: 'json', value, status: response.status }
          : { outcome: 'unreadable', status: response.status };
      } catch {
        return { outcome: 'unreadable', status: response.status };
      }
    } catch {
      // An abort we caused is a deadline (F19); anything else is transport (F17).
      return timedOut ? { outcome: 'timeout' } : { outcome: 'unreadable', status: null };
    } finally {
      clearTimeout(timer);
    }
  }
}
