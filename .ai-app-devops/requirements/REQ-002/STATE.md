---
workflow_type: business_direct_app_v1
project_mode: EXISTING
status: COMPLETE
pending_action: null
execution_cursor: null
application_id: todo-list-poc
requirement_id: REQ-002
run_id: DEMO-REQ-002-20260920-01
branch: req/REQ-002
worktree_path: C:/aiproject/.worktrees/todo-list-poc/REQ-002
base_sha: d3731f514aadd8273a70193e7122fac809a2b23f
thread_id: local-codex-session-20260920
state_revision: 14
repair_count: 1
clarification_round: 0
linear_issue_id: 166d073a-4a67-4168-a759-78f4b593d156
linear_sync_revision: 2
linear_timeline_comment_id: f7f5d834-1269-4741-86e9-5cfc9122bd13
linear_spec_issue_id: 7de74b3b-53cc-4d3e-82c0-39ecb54d4e9a
linear_spec_synced_revision: 2
linear_spec_synced_at: 2026-09-20
linear_mirrored_milestone: COMPLETE
application_lock: todo-list-poc/REQ-002
---

# Requirement state

REQ-002 adds an optional due date to a task in the existing `todo-list-poc`
application. The requirement is confirmed and a verified preview of it is
ready: the visitor may pick a due date when adding a task, a task with a date
shows it, an open task past its date is marked overdue, a done task never is,
and a date can be changed or cleared so it stays optional.

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

The application lock `todo-list-poc/REQ-002` is held through `PUBLISHING`.
`business_direct_developer` built the confirmed baseline in this worktree;
`spec.md` is the confirmed baseline, and `plan.md`/`tasks.md` are internal SDD
artifacts that never sync to Linear. The `Requirement Spec: REQ-002` child issue
holds the confirmed `spec.md` and is at `Requirement Done`.

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

The tester's key path passed against a preview built from the repaired revision
(4/4, including the retained REQ-001 cases) and still failed at AC-003 on the
pre-repair preview, so the pass is discriminating. The case now configures its
own 120-second timeout: the journey needs roughly 32 seconds of server-action
round trips against the deployed preview and the 30-second project default
expired in cleanup after every acceptance assertion had passed. No step, wait or
assertion was removed or relaxed.

## Preview pause

`WAITING_ON_PREVIEW` is the single mandatory business pause. The offered artifact
is GitHub Actions run `35541687745` on `baa6063`, self-checked at `HTTP 200`:
`https://todo-list-gpo6to3nq-air9.vercel.app`. The coordinator re-ran the key path
against that exact revision (4/4 passed) so the tested commit and the offered
artifact are the same. `proto_todo_list_poc` holds zero rows and
`app_todo_list_poc` was not touched. No production operation may start before the
matching business confirmation is verified.

## Revision content

- Confirmed change statement: `.ai-app-devops/requirements/REQ-002/CHANGE-STATEMENT.md`
- Confirmed specification: `specs/REQ-002/spec.md`, synced to the Requirement
  Spec child issue and confirmed by the Business App Owner.
