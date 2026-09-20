# REQ-002 outbound ledger

| Outbound item | Kind | Target | Revision | Idempotency key | Readback |
| --- | --- | --- | --- | --- | --- |
| OUT-001 | spec_child_sync | Linear child issue A8-100 (`7de74b3b-53cc-4d3e-82c0-39ecb54d4e9a`), parent A8-99 | 1 | `REQ-002:spec-child:r1` | Created `Requirement Spec: REQ-002` with label `Non-Tech`, parent `A8-99`, state `Requirement Reviewing`, description ending in `<!-- air8-business-direct:spec:todo-list-poc:REQ-002 -->`. Read back by `get_issue` and by `list_issues(parentId=A8-99)`; exactly one child exists. |
| OUT-002 | timeline_comment | Linear main issue A8-99 (`166d073a-4a67-4168-a759-78f4b593d156`), comment `f7f5d834-1269-4741-86e9-5cfc9122bd13` | 1 | `REQ-002:timeline:r1` | Rolling milestone comment created, first line `<!-- air8-business-direct:milestones:todo-list-poc:REQ-002 -->`. Read back by `list_comments`; exactly one comment carries that marker. No recipient token. |
| OUT-003 | state_mirror | Linear main issue A8-99 | 1 | `REQ-002:state:WAITING_ON_BUSINESS:r1` | Main issue state read back as `Requirement Reviewing`. No `Start *` state was written. |
| OUT-004 | reply_request | Linear main issue A8-99, comment `0f8e3cff-c651-47ca-ab55-850d65d07c86` | 1 | `REQ-002:reply:r1` | Action comment posted beginning `@BUSINESS_APP_OWNER` and carrying `<!-- air8-business-direct:reply:todo-list-poc:REQ-002:1 -->`. Read back by `list_comments`; exactly one reply-request comment exists and it contains no legacy hand-off token. |
| OUT-005 | spec_child_sync | Linear child issue A8-100 (`7de74b3b-53cc-4d3e-82c0-39ecb54d4e9a`), parent A8-99 | 2 | `REQ-002:spec-child:r2` | Confirmed `spec.md` replaced the child description in full, marker `<!-- air8-business-direct:spec:todo-list-poc:REQ-002 -->` retained as the final line. Read back by `get_issue`. |
| OUT-006 | child_state_mirror | Linear child issue A8-100 | 2 | `REQ-002:spec-child-state:r2` | Child moved alone to `Requirement Done` after the business confirmation. Read back by `get_issue`; `statusType=completed`. The main issue A8-99 was not moved by this write, and the listener skipped it (`decision=skipped status Requirement Done`). |
| OUT-007 | timeline_comment | Linear main issue A8-99, comment `f7f5d834-1269-4741-86e9-5cfc9122bd13` | 2 | `REQ-002:timeline:r2` | The same rolling milestone comment was updated in place with the `Creating preview` milestone. Read back by `save_comment`; exactly one comment carries the marker, and it contains no recipient token. |
| OUT-008 | state_mirror | Linear main issue A8-99 | 2 | `REQ-002:state:BUILDING_PREVIEW:r2` | Main issue state read back as `Developing`. No `Start *` state was written. |
| OUT-009 | timeline_comment | Linear main issue A8-99, comment `f7f5d834-1269-4741-86e9-5cfc9122bd13` | 3 | `REQ-002:timeline:r3` | The same rolling milestone comment was updated in place with the `Preview ready` milestone, including the verified preview URL. Read back by `save_comment`; exactly one comment carries the marker, and it contains no recipient token. |
| OUT-010 | state_mirror | Linear main issue A8-99 | 3 | `REQ-002:state:WAITING_ON_PREVIEW:r3` | Main issue state read back as `Prototype Reviewing`. No `Start *` state was written. |
| OUT-011 | reply_request | Linear main issue A8-99 | 2 | `REQ-002:reply:r2` | Posted exactly one action comment beginning `@BUSINESS_APP_OWNER` and carrying `<!-- air8-business-direct:reply:todo-list-poc:REQ-002:2 -->`, presenting the verified preview URL and a copyable confirm/change/cancel reply block. Read back by `list_comments`; exactly one comment carries that marker and it contains no legacy hand-off token. |

## Kinds

- `timeline_comment` - the single rolling milestone comment, updated in place
  against the recorded comment id.
- `reply_request` - an action comment carrying the recipient token and asking
  for a business reply. One per requirement revision that needs a decision.
- `state_mirror` - a milestone state write on the main issue.
- `spec_child_sync` - the Requirement Spec child description replaced in full
  with the current `spec.md`. Only `spec.md` is synced; `plan.md`, `tasks.md`
  and `testcases.md` never are.
