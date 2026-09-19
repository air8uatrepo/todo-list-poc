# REQ-001 events

| Event | Source | Prior -> next revision | Outcome | Idempotency key |
| --- | --- | --- | --- | --- |
| EVT-001 | Local orchestrator | 0 -> 1 | Created public repository `air8uatrepo/todo-list-poc` and the local application records. | `REQ-001:repo:r1` |
| EVT-002 | Local orchestrator | 1 -> 2 | Created Vercel project `prj_oKlEeLDIeLu3BNlTR9EeKIjXwvig` and recorded it in the application registry. | `REQ-001:project:r2` |
| EVT-003 | Local orchestrator | 2 -> 3 | Bootstrapped the least-privilege role `todo_list_poc_app`; applied the migration to `proto_todo_list_poc` and `app_todo_list_poc`; verified schema, table, RLS, grants and policy by readback. | `REQ-001:db:r3` |
| EVT-004 | Local orchestrator | 3 -> 4 | Local E2E passed (3/3). Business confirmation recorded from verified evidence under gate mode `Auto-Gated`. | `REQ-001:confirm:r4` |
| EVT-005 | Local orchestrator | 4 -> 5 | Deploy workflow run `35447563042` succeeded on `0d11ac5` with its own HTTP 200 self-check; production E2E passed; production proven to write to `app_todo_list_poc`, not `proto_todo_list_poc`. | `REQ-001:release:r5` |
| EVT-006 | Local orchestrator | 5 -> 6 | Mirrored the completed delivery to Linear issue A8-96 and recorded its id. | `REQ-001:linear-mirror:r6` |

