---
workflow_type: business_direct_app_v1
project_mode: NEW
status: COMPLETE
pending_action: null
execution_cursor: null
application_id: todo-list-poc
requirement_id: REQ-001
run_id: DEMO-REQ-001-20260919-01
branch: req/REQ-001
worktree_path: C:/aiproject/.worktrees/todo-list-poc/REQ-001
base_sha: 0d11ac528c5bc5e44f5e72d6ce6717619d6c3451
thread_id: local-codex-session-20260919
state_revision: 7
repair_count: 0
clarification_round: 0
linear_issue_id: 94273eee-4ded-48c0-8f3e-f080b8ac0713
linear_sync_revision: 2
application_lock: todo-list-poc/REQ-001
---

# Requirement state

REQ-001 delivers a minimal personal todo list. A visitor is initialized with an
opaque owner token on first use, so there is no registration step, and each
owner sees only their own tasks.

## Correction: the preview gate was short-circuited

The first pass committed directly to `master` and deployed without creating the
`req/REQ-001` branch, its isolated worktree, or a preview deployment. That
skipped the single mandatory preview pause, so no preview artifact existed to
confirm, and the `MERGE_MASTER` cursor was effectively bypassed.

Corrected by creating `req/REQ-001` and its isolated worktree from the delivered
revision, pushing the requirement branch, and producing and verifying a preview
deployment. The workflow contract now treats this signature (requirement commits
on the default branch, no requirement branch, production deployments but no
preview deployment) as a defect rather than a shortcut.

## Verified evidence

- Unit tests: 15 passed. Local E2E: 3 passed against the dev server.
- Preview deployment from `req/REQ-001`: workflow run `35453066011`, URL
  `https://todo-list-i3gzax2sj-air9.vercel.app`, verified by E2E (3 passed).
- Preview traffic was proven by readback to write to `proto_todo_list_poc` and
  not to `app_todo_list_poc`.
- Production deployment from `master`: workflow runs `35447563042` and
  `35449020549` succeeded, each including its own HTTP 200 self-check.
- Production E2E: 3 passed against `https://todo-list-poc.vercel.app`.
- Production traffic was proven by readback to write to `app_todo_list_poc` and
  not to `proto_todo_list_poc`, so the two tiers are genuinely separated rather
  than sharing a value.
- The committed migration was verified to rebuild the whole working target:
  schema, table, RLS enabled, grants and policy, for both tiers.
- Deployment creator read back as the fixed platform account `air8uat-6696`,
  not the pushing identity.
