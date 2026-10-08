/**
 * The `core/services` barrel — T075.
 *
 * `testing/failing-survey-response.gateway.ts` is deliberately **not** re-exported.
 * `tsconfig.app.json` excludes that directory, so an import of it from application code is
 * a build failure — which is how FR-068's "reachable only from a test, never from a
 * running build" becomes enforced rather than merely intended. Re-exporting it here would
 * put it back on the application's import graph.
 *
 * `plan.md` §5.1 on what belongs in this directory: anything that touches the network, the
 * clock, randomness or the DOM, plus the one signal-backed session. A file here need not be
 * `@Injectable` — `survey-response-payload.ts` and `survey-timeouts.ts` have no dependency
 * to inject.
 */

export * from './announcer.service';
export * from './attachment-codec.service';
export * from './document-title.service';
export * from './id-factory.service';
export * from './json-fetch.service';
export * from './simulated-survey-response.gateway';
export * from './survey-catalog.service';
export * from './survey-loader.service';
export * from './survey-response-payload';
export * from './survey-response.gateway';
export * from './survey-session.service';
export * from './survey-timeouts';
