/**
 * Single source of truth for the approved synthetic data prefix.
 *
 * Every fixture, displayed value, export assertion, screenshot label and
 * persistence value on this application is `DEMO-<requirement-id>-<run-id>`.
 * The prefix is defined per requirement, so a spec can never silently assert
 * against another requirement's prefix: the previous design read one shared
 * `BUSINESS_DIRECT_E2E_RUN_ID` and rebuilt `DEMO-REQ-001-<that run id>`, which
 * asserts on the wrong requirement as soon as the run id belongs to a different
 * requirement.
 *
 * `APPROVED_PREFIXES` is a closed list: the Playwright global setup rejects any
 * target approval that is not in it, so an unapproved or misspelled prefix
 * still fails closed.
 */
export const APPROVED_RUN_ID = {
  'REQ-001': '20260919-01',
  'REQ-002': '20260920-01',
} as const;

export type RequirementId = keyof typeof APPROVED_RUN_ID;

export const APPROVED_PREFIXES: readonly string[] = Object.entries(APPROVED_RUN_ID).map(
  ([requirementId, runId]) => `DEMO-${requirementId}-${runId}`,
);

/** The approved `DEMO-<requirement-id>-<run-id>` prefix for one requirement. */
export function syntheticPrefix(requirementId: RequirementId): string {
  return `DEMO-${requirementId}-${APPROVED_RUN_ID[requirementId]}`;
}

/**
 * A per-run suffix so a shared POC database cannot make a text lookup
 * ambiguous: fixed fixtures collide with rows an earlier run left behind, and a
 * lookup that matches several elements makes every count assertion meaningless.
 * The required `DEMO-<requirement-id>-<run-id>` prefix is preserved.
 */
export function uniqueRunToken(): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `r${time}${random}`;
}
