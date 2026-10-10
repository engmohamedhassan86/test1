# `core/services`

Anything that touches the network, the clock, randomness or the DOM, plus the one
signal-backed session (`plan.md` §5.1). A file here need not be `@Injectable`:
`survey-response-payload.ts` and `survey-timeouts.ts` are not, because they have no
dependency to inject — they live here because they belong to the effectful layer, not
because Angular has to construct them.

The boundary against the sibling directories, from `plan.md` §5.1:

- **`models/`** holds types and the pure functions that are _properties of the domain_ —
  `ratingPresentation`, `effectiveMinSelections`, `canTransition`, the FR-071 size
  formatter. Nothing there decides valid or invalid, and nothing there has a dependency.
- **`validators/`** holds the pure functions that _do_ decide valid or invalid and own the
  message a failure produces, including the FR-069 catalogue.
- **`services/`** — this directory — holds the effects. A service may call a validator; a
  validator may never call a service.

`survey-session.service.ts` is the single signal-backed source of truth for survey state
(FR-046). Components read its signals and call its methods; they do not hold session state
of their own, and they do not re-derive what it already exposes.

`testing/failing-survey-response.gateway.ts` is a test adapter and is deliberately **not**
re-exported from `index.ts`. `tsconfig.app.json` excludes that directory, so an import of
it from application code is a build failure — which is how FR-068's "reachable only from a
test, never from a running build" becomes enforced rather than merely intended.
`tsconfig.spec.json` still compiles it, so `pnpm tsc --noEmit` and coverage still cover it.
