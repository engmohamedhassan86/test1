/**
 * T018 — the full 8 × 8 `canTransition` matrix, asserted against `plan.md` §3's table.
 *
 * The matrix is written out here as data rather than derived from
 * `RESPONSE_STATE_TRANSITIONS`, because deriving it would assert the table against
 * itself. This copy is the second, independent statement of FR-046.
 */

import {
  RESPONSE_STATE_KINDS,
  RESPONSE_STATE_TRANSITIONS,
  canTransition,
} from './response-state.model';
import type { ResponseStateKind } from './response-state.model';

/** `plan.md` §3, transcribed by hand. `from` → every `to` that is legal. */
const EXPECTED: Readonly<Record<ResponseStateKind, readonly ResponseStateKind[]>> = {
  loading: ['ready', 'configuration-error'],
  ready: ['editing', 'validation-error'],
  editing: ['editing', 'validation-error', 'submitting'],
  'validation-error': ['validation-error', 'editing'],
  submitting: ['submitted', 'submission-error'],
  submitted: [],
  'submission-error': ['submission-error', 'editing', 'submitting'],
  'configuration-error': [],
};

describe('canTransition — the full 8 × 8 matrix (64 assertions)', () => {
  it('covers all eight kinds, so the matrix below is complete', () => {
    expect(RESPONSE_STATE_KINDS).toHaveLength(8);
    expect([...RESPONSE_STATE_KINDS].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const from of RESPONSE_STATE_KINDS) {
    for (const to of RESPONSE_STATE_KINDS) {
      const legal = EXPECTED[from].includes(to);
      it(`${legal ? 'allows' : 'refuses'} ${from} -> ${to}`, () => {
        expect(canTransition(from, to)).toBe(legal);
      });
    }
  }
});

describe('the four fail-closed consequences (FR-046)', () => {
  it('gives submitted no outgoing edge — nothing leaves it', () => {
    expect(RESPONSE_STATE_TRANSITIONS.submitted).toEqual([]);
  });

  it('gives configuration-error no outgoing edge — the way out is a navigation to /', () => {
    expect(RESPONSE_STATE_TRANSITIONS['configuration-error']).toEqual([]);
  });

  it('gives submitted exactly one incoming edge, from submitting (SC-006)', () => {
    const incoming = RESPONSE_STATE_KINDS.filter((from) => canTransition(from, 'submitted'));
    expect(incoming).toEqual(['submitting']);
  });

  it('gives submitting no self-edge, so a second Submit is refused by the table (FR-039)', () => {
    expect(canTransition('submitting', 'submitting')).toBe(false);
  });
});

describe('the three deliberate self-edges (data-model §8.1)', () => {
  it.each([
    ['editing', 'changing another answer, and Previous/Next within the survey'],
    ['validation-error', 'Next pressed again with the page still invalid'],
    ['submission-error', 'Previous and Next still work while the error stands'],
  ] as const)('allows %s -> itself (%s)', (kind, _why) => {
    expect(canTransition(kind, kind)).toBe(true);
  });

  it('allows no other self-edge', () => {
    const selfEdges = RESPONSE_STATE_KINDS.filter((kind) => canTransition(kind, kind));
    expect(selfEdges).toEqual(['editing', 'validation-error', 'submission-error']);
  });
});

describe('the transition table itself', () => {
  it('is frozen, so no caller can widen the machine at runtime', () => {
    expect(Object.isFrozen(RESPONSE_STATE_TRANSITIONS)).toBe(true);
    expect(Object.isFrozen(RESPONSE_STATE_TRANSITIONS.loading)).toBe(true);
  });

  it('holds exactly eleven edges between distinct states, plus three self-edges', () => {
    // `data-model.md` §8.1's prose says "twelve edges between distinct states". Counting
    // the table it ships — which is `plan.md` §3 verbatim, and which the 64-assertion
    // matrix above checks row by row — gives eleven: 2 + 2 + 2 + 1 + 2 + 0 + 2 + 0. The
    // table is authoritative and FR-046 is satisfied; the prose count is the defect, and
    // it is flagged to the Solution Architect rather than worked around here.
    const edges = RESPONSE_STATE_KINDS.flatMap((from) =>
      RESPONSE_STATE_TRANSITIONS[from].map((to) => ({ from, to })),
    );
    expect(edges.filter((edge) => edge.from !== edge.to)).toHaveLength(11);
    expect(edges.filter((edge) => edge.from === edge.to)).toHaveLength(3);
  });
});
