# `core/validators`

Pure functions that decide valid or invalid, and that own the message a failure produces.
Nothing here is injectable, reads a clock, touches the network or imports from `features/`.

The boundary against the sibling directories, from `plan.md` §5.1:

- **`models/`** holds types and the pure functions that are _properties of the domain_ —
  `ratingPresentation`, `effectiveMinSelections`, `canTransition`, the FR-071 size
  formatter. Nothing in `models/` decides valid or invalid.
- **`validators/`** — this directory — holds the functions that _do_ decide valid or
  invalid: the config and manifest rule sets (`contracts/survey-json.md` §9 R03–R61), the
  per-question answer rules (FR-012 to FR-018, FR-070), the attachment checks (FR-023) and
  the receipt guard (FR-037). The FR-069 message catalogue lives here, in `messages.ts`,
  because a message is the output of a rule rather than a property of the domain — and no
  survey config may supply wording.
- **`services/`** holds anything effectful, plus the one signal-backed session.

`__fixtures__/` holds the deliberately invalid configs and manifests the contract tests
iterate; it is test data and is not re-exported from `index.ts`.
