# REQ-002 behavior-sized tasks

Internal SDD artifact for `BUILDING_PREVIEW`. Not synced to Linear, never a
business gate. One task is one independently verifiable behavior with its
targeted tests, per the confirmed baseline in `specs/REQ-002/spec.md`.

| Task | Behavior | Linked acceptance | Files | Verification | Risk | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TASK-001 | The domain can decide "past the visitor local today" by calendar date and render a date readably | AC-003, AC-004, A-1, A-2 | `src/lib/todos.ts`, `tests/todos.test.ts` | `npx vitest run tests/todos.test.ts` | High | DONE |
| TASK-002 | The due date is stored additively and the pinned migration stays able to rebuild the whole target | AC-001, AC-002, A-2 | `supabase/migrations/templates/002_add_todo_due_date.sql.tmpl`, `supabase/migrations/manifest.json`, `tests/migration-template.test.ts` | `npx vitest run tests/migration-template.test.ts` | High | DONE |
| TASK-003 | A driver `Date` never reaches a component as a date object or an ISO timestamp | AC-002, AC-006 | `src/lib/todos-repository.ts`, `tests/todos-repository.test.ts` | `npx vitest run tests/todos-repository.test.ts` | High | DONE |
| TASK-004 | A create request may carry an optional due date, and an impossible date is refused | AC-001, A-3 | `src/lib/todos.ts`, `app/actions.ts`, `app/api/todos/route.ts`, `app/add-todo-form.tsx`, `tests/todos.test.ts` | `npx vitest run tests/todos.test.ts` | Medium | DONE |
| TASK-005 | The row shows the date, marks an open past task overdue, and can change or clear the date | AC-002, AC-003, AC-005, A-4, A-5, A-6 | `app/due-date.tsx`, `app/page.tsx`, `app/globals.css`, `tests/due-date.test.tsx` | `npx vitest run tests/due-date.test.tsx` | High | DONE |
| TASK-006 | The whole local suite, lint, and build pass with the earlier key-path coverage intact | all | `specs/REQ-002/plan.md`, `specs/REQ-002/tasks.md` | `npm test`, `npm run lint`, `npm run build` | Medium | DONE |
| TASK-007 | The shipped minified script actually reveals the mark in a real browser, not only in the unit environment | AC-003, A-2 | `src/lib/overdue-mark.ts`, `tests/due-date.test.tsx` | `npx vitest run tests/due-date.test.tsx`, `npm run build` + real-browser check | High | DONE |

## Notes

- Status is TODO until that task has fresh red and green evidence.

- TASK-001 and TASK-005 carry the highest risk: TASK-001 owns the calendar-date
  rule that AC-003/AC-004 depend on, and TASK-005 owns the visitor-local-day
  decision, which is the one place the server cannot decide for the browser.
- TASK-002 is additive only: `due_date` is nullable with no default, and the
  pinned `001_create_todos.sql.tmpl` is not edited.
- TASK-006 covers the preserved REQ-001 coverage; no existing E2E artifact is
  modified.
- TASK-007 exists because TASK-001/TASK-005 passed every local check and still failed in a minified build: the serializer emitted function bodies whose references to module bindings were renamed by the minifier while the emitted declarations were not, so the script threw `c is not defined` in the browser only. The wiring now takes every value as a parameter, and the guard test fails if a free module identifier returns.
- No task invokes a business gate, writes Linear, or performs a state write.
