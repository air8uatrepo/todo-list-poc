# REQ-002 events

| Event | Source | Prior -> next revision | Outcome | Idempotency key |
| --- | --- | --- | --- | --- |
| EVT-001 | Business App Owner (Linear A8-99) | 0 -> 1 | Adopted `A8-99` as the requirement main issue and verified the `EXISTING` application identity: `air8uatrepo/todo-list-poc` public, `master` clean at `d3731f514aadd8273a70193e7122fac809a2b23f`. | `REQ-002:intake:r1` |
| EVT-002 | Local orchestrator | 1 -> 2 | Created `req/REQ-002` and its isolated worktree, the local state records, the draft change statement and the first draft `spec.md`; entered `WAITING_ON_BUSINESS` for the single business confirmation. | `REQ-002:clarify-draft:r2` |