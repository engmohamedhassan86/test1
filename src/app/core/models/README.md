# `core/models`

Types, and the pure functions that are _properties of the domain_ rather than decisions
about validity: `ratingPresentation`, `effectiveMinSelections`, `canTransition`, the
FR-071 size formatter, the FR-072 accepted-type labels and the FR-077 document titles.
Nothing in here decides valid or invalid, and nothing in here has a dependency to inject.
The sibling directories split the rest: `validators/` holds the pure functions that _do_
decide valid or invalid and own the message for a failure, and `services/` holds anything
that touches the network, the clock, randomness or the DOM, plus the one signal-backed
session (`plan.md` §5.1). Every type here is `readonly` throughout, including arrays and
maps, and no file under `core/` uses `any` — unvalidated input is `unknown`, and the only
layer that may narrow it is a validator.
