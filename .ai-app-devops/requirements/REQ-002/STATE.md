---
workflow_type: business_direct_app_v1
project_mode: EXISTING
status: BUILDING_PREVIEW
pending_action: PREVIEW_REPAIR
execution_cursor: null
application_id: todo-list-poc
requirement_id: REQ-002
run_id: DEMO-REQ-002-20260920-01
branch: req/REQ-002
worktree_path: C:/aiproject/.worktrees/todo-list-poc/REQ-002
base_sha: d3731f514aadd8273a70193e7122fac809a2b23f
thread_id: local-codex-session-20260920
state_revision: 5
repair_count: 1
clarification_round: 0
linear_issue_id: 166d073a-4a67-4168-a759-78f4b593d156
linear_sync_revision: 2
linear_timeline_comment_id: f7f5d834-1269-4741-86e9-5cfc9122bd13
linear_spec_issue_id: 7de74b3b-53cc-4d3e-82c0-39ecb54d4e9a
linear_spec_synced_revision: 2
linear_spec_synced_at: 2026-09-20
linear_mirrored_milestone: BUILDING_PREVIEW
application_lock: todo-list-poc/REQ-002
---

# Requirement state

REQ-002 adds an optional due date to a task in the existing `todo-list-poc`
application. The requirement is confirmed and is being built for preview: the
visitor may pick a due date when adding a task, a task with a date shows it, an
open task past its date is marked overdue, a done task never is, and a date can
be changed or cleared so it stays optional.

## Identity

- Adopted the triggering Linear issue `A8-99`
  (`166d073a-4a67-4168-a759-78f4b593d156`) as the main issue; no second main
  issue was created.
- `EXISTING` mode: verified `air8uatrepo/todo-list-poc` is public and in the
  organization, default branch `master`, clean baseline at
  `d3731f514aadd8273a70193e7122fac809a2b23f`.
- Requirement branch `req/REQ-002` and its isolated worktree
  `C:/aiproject/.worktrees/todo-list-poc/REQ-002` were created from that base
  SHA before any role dispatch.

## Confirmation and current work

The Business App Owner confirmed revision 1 on 2026-09-20, accepting the change
statement and assumptions `A-1`..`A-6` as written. That confirmation is the sole
business confirmation before development, so no further business reply is
required until a verified preview exists.

The application lock `todo-list-poc/REQ-002` is held and `business_direct_developer`
is building the confirmed baseline in this worktree. `spec.md` is the confirmed
baseline; `plan.md` and `tasks.md` are internal SDD artifacts created inside
`BUILDING_PREVIEW` and are never synced to Linear. The `Requirement Spec: REQ-002`
child issue holds the confirmed `spec.md` and is at `Requirement Done`.

## Preview repair 1

A verified preview existed, but the mandatory independent tester pass had not
run, so the preview URL was never offered to the Business App Owner and the
single business pause has not occurred. `business_direct_tester` ran
`PREVIEW_E2E` and its new key path `E2E-KP-REQ-002-001` failed at AC-003: a
newly listed open past-dated task kept a `hidden` overdue mark until a full
reload, because the inline overdue script ran only at parse time and was not
re-applied when the list updated in place through a server action.

`business_direct_developer` repaired it in `src/lib/overdue-mark.ts` by
re-running the same parameterized pass from a guarded `MutationObserver` and by
setting `hidden` from the rule in both directions, so a date moved beyond today
also loses a previously revealed mark. The rule stays import-free and the
serialized bodies still take every value as a parameter, so the emitted script
remains runnable in a minified build. `spec.md` and its acceptance criteria are
unchanged; this was an implementation defect, not a business change.

The tester's key path must pass against a preview built from the repaired
revision before `WAITING_ON_PREVIEW` is entered.

## Revision content

- Confirmed change statement: `.ai-app-devops/requirements/REQ-002/CHANGE-STATEMENT.md`
- Confirmed specification: `specs/REQ-002/spec.md`, synced to the Requirement
  Spec child issue and confirmed by the Business App Owner.
