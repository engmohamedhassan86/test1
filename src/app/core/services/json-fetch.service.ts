import { inject, Injectable } from '@angular/core';

import { SURVEY_TIMEOUTS, SurveyTimeouts } from './survey-timeouts';

export type JsonFetchResult =
  | { outcome: 'json'; value: unknown; status: number }
  | { outcome: 'unreadable'; status: number | null }
  | { outcome: 'timeout' };

@Injectable({ providedIn: 'root' })
export class JsonFetchService {
  private readonly timeouts = inject(SURVEY_TIMEOUTS);

  async fetchJson(url: string): Promise<JsonFetchResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeouts.fetchMs);

    try {
      const response = await fetch(url, { signal: controller.signal });

      clearTimeout(timeoutId);

      const body = await response.text();

      if (!response.ok) {
        return { outcome: 'unreadable', status: response.status };
      }

      try {
        const value = JSON.parse(body);
        return { outcome: 'json', value, status: response.status };
      } catch {
        return { outcome: 'unreadable', status: response.status };
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        return { outcome: 'timeout' };
      }

      return { outcome: 'unreadable', status: null };
    }
  }
}
