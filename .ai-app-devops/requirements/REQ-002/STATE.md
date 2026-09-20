---
workflow_type: business_direct_app_v1
project_mode: EXISTING
status: WAITING_ON_BUSINESS
pending_action: BUSINESS_CONFIRMATION
execution_cursor: null
application_id: todo-list-poc
requirement_id: REQ-002
run_id: DEMO-REQ-002-20260920-01
branch: req/REQ-002
worktree_path: C:/aiproject/.worktrees/todo-list-poc/REQ-002
base_sha: d3731f514aadd8273a70193e7122fac809a2b23f
thread_id: local-codex-session-20260920
state_revision: 2
repair_count: 0
clarification_round: 0
linear_issue_id: 166d073a-4a67-4168-a759-78f4b593d156
linear_sync_revision: 1
linear_timeline_comment_id: null
linear_spec_issue_id: 7de74b3b-53cc-4d3e-82c0-39ecb54d4e9a
linear_spec_synced_revision: 1
linear_spec_synced_at: 2026-09-20
linear_mirrored_milestone: WAITING_ON_BUSINESS
application_lock: null
---

# Requirement state

REQ-002 adds an optional due date to a task in the existing `todo-list-poc`
application. The draft is under business review: the visitor may pick a due
date when adding a task, a task with a date shows it, an open task past its
date is marked overdue, a done task never is, and a date can be changed or
cleared so it stays optional.

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

## Blocking condition

One business confirmation is required: the Business App Owner must confirm or
return the change statement and the draft `spec.md` for revision 1. No
application source has been changed. `REQ-001` holds no lock; the application
lock is created only when this record enters `BUILDING_PREVIEW`.

## Revision 1 content

- Draft change statement: `.ai-app-devops/requirements/REQ-002/CHANGE-STATEMENT.md`
- Draft specification: `specs/REQ-002/spec.md`, synced to the Requirement Spec
  child issue for review.