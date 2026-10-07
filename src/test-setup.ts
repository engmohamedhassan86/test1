/**
 * Vitest global setup. Initializes the Angular TestBed once per worker.
 *
 * The app is zoneless, so no `zone.js` polyfill is loaded and no
 * `provideZoneChangeDetection()` is registered — `provideZonelessChangeDetection()`
 * is the only change-detection provider the TestBed needs.
 */
import '@angular/compiler';
import { NgModule, provideZonelessChangeDetection } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

@NgModule({
  providers: [provideZonelessChangeDetection()],
})
class ZonelessTestModule {}

getTestBed().initTestEnvironment(
  [BrowserTestingModule, ZonelessTestModule],
  platformBrowserTesting(),
  {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
  },
);
