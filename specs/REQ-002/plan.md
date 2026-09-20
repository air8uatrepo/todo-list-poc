# REQ-002 Optional Due Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a visitor set an optional due date on a task, see it on the row,
and see an open task past its date marked overdue, with the date changeable and
clearable on the row itself.

**Architecture:** The due date is a nullable `date` column added by an additive
migration. The `pg` driver returns a `Date` for a `date` column, so the
repository normalizes it to a stable `YYYY-MM-DD` text at the repository
boundary; no component ever receives a raw `Date`. The calendar-date decision
("is this past the visitor local today?") runs in a small client component
because only the browser knows the visitor local calendar day, while the server
runs in UTC.

**Tech Stack:** Next.js 16 App Router (Server Components + Server Actions),
React 19, TypeScript 5.9 (strict), `pg` 8.16, Vitest 5, Playwright 1.63,
PostgreSQL/Supabase.

**Spec:** `specs/REQ-002/spec.md` (confirmed revision 1, 2026-09-20)

## Global Constraints

- Confirmed baseline: `specs/REQ-002/spec.md` revision 1 and
  `.ai-app-devops/requirements/REQ-002/CHANGE-STATEMENT.md` revision 1,
  confirmed by the Business App Owner on 2026-09-20 (A-1..A-6 accepted).
- Overdue is decided by calendar date, not time of day. A task due today is NOT
  overdue (AC-003, A-1).
- "Today" is the visitor own local calendar day as the browser shows it; the
  deployment runs in UTC, so the comparison must not depend on the server
  timezone (A-1).
- Only the date matters; no time of day is stored or shown (A-2).
- A past date may be chosen; the form must not refuse it (A-3).
- The list keeps `created_at desc` order and is never re-sorted; overdue tasks
  are marked only (A-4).
- The due date is set/changed/cleared on the task row itself (AC-005, A-5).
- The overdue mark sits on the row; toggle-done and delete keep working (A-6).
- Clearing the date removes both the date text and the overdue mark (AC-005,
  EX-EMPTY-002).
- A task with no date behaves exactly as today (AC-006).
- Migrations are additive only: no dropped/renamed columns, no schema
  recreation, no new required field, and existing populated rows must keep
  working with `NULL`. The pinned `001_create_todos.sql.tmpl` must never be
  edited.
- Synthetic data only, of the form `DEMO-REQ-002-20260920-01`. No real name,
  telephone number, address, or business value may appear in source, fixtures,
  tests, evidence, logs, or exports.
- Keep every existing test green and unchanged: `tests/todos.test.ts`,
  `tests/migration-template.test.ts`, `e2e/req-001-todos.spec.ts`,
  `e2e/global-setup.ts`, `playwright.config.ts`.
- No new npm dependency without justification; no dynamic `process.env[name]`
  access for anything the browser needs.
- Verification commands: `npm test`, `npm run lint`, `npm run build`.

---

### Task 1: Calendar-date domain helpers and due-date validation

**Files:**
- Modify: `src/lib/todos.ts`
- Test: `tests/todos.test.ts` (append; existing assertions untouched)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `localCalendarDate(now: Date): string` - the local calendar day of `now`
    as `YYYY-MM-DD`, built from local getters.
  - `isOverdue(dueDate: string, isDone: boolean, today: string): boolean` -
    true only when the task is open and `dueDate < today`.
  - `formatDueDate(dueDate: string): string` - `YYYY-MM-DD` to `30 Sep 2026`,
    computed from the string parts so it is timezone-independent.
  - `validateDueDate(raw: unknown): DueDateValidation` - `''`/`undefined` to
    `null`; a real `YYYY-MM-DD` to itself; anything else to an error.
  - `parseCreateTodoInput(body: unknown): TodoInputValidation` - title plus
    optional due date.

- [ ] **Step 1: Write the failing test**

```ts
describe('due date helpers', () => {
  it('formats a date without a timezone shift', () => {
    expect(formatDueDate('2026-09-30')).toBe('30 Sep 2026');
    expect(formatDueDate('2026-01-01')).toBe('1 Jan 2026');
  });

  it('reads the visitor local calendar day', () => {
    expect(localCalendarDate(new Date(2026, 8, 20, 0, 5))).toBe('2026-09-20');
    expect(localCalendarDate(new Date(2026, 8, 20, 23, 55))).toBe('2026-09-20');
  });

  it('treats a task due today as not overdue', () => {
    expect(isOverdue('2026-09-20', false, '2026-09-20')).toBe(false);
    expect(isOverdue('2026-09-19', false, '2026-09-20')).toBe(true);
  });

  it('never marks a done task overdue', () => {
    expect(isOverdue('2026-09-19', true, '2026-09-20')).toBe(false);
  });
});

describe('validateDueDate', () => {
  it('accepts empty as no date', () => {
    expect(validateDueDate('')).toEqual({ ok: true, value: { dueDate: null } });
    expect(validateDueDate(undefined)).toEqual({ ok: true, value: { dueDate: null } });
  });

  it('accepts a real date, including a past one', () => {
    expect(validateDueDate('2026-09-30')).toEqual({ ok: true, value: { dueDate: '2026-09-30' } });
    expect(validateDueDate('2026-09-18')).toEqual({ ok: true, value: { dueDate: '2026-09-18' } });
  });

  it('rejects a malformed or impossible date', () => {
    expect(validateDueDate('30/09/2026').ok).toBe(false);
    expect(validateDueDate('2026-02-30').ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/todos.test.ts`
Expected: FAIL - `formatDueDate is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const DUE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function localCalendarDate(now: Date): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

export function isOverdue(dueDate: string, isDone: boolean, today: string): boolean {
  return !isDone && dueDate < today;
}

export function formatDueDate(dueDate: string): string {
  const match = DUE_DATE_PATTERN.exec(dueDate);
  if (match === null) return dueDate;
  return `${Number(match[3])} ${MONTH_NAMES[Number(match[2]) - 1]} ${match[1]}`;
}
```

`validateDueDate` rejects when the pattern fails or the day does not exist
(check with `Date.UTC` and compare the UTC parts back, so the check is
timezone-independent).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/todos.test.ts`
Expected: PASS, with the pre-existing title assertions still green.

- [ ] **Step 5: Commit**

Not performed: the coordinator owns commits and the packet forbids branching or
committing.

---

### Task 2: Additive migration and manifest pin

**Files:**
- Create: `supabase/migrations/templates/002_add_todo_due_date.sql.tmpl`
- Modify: `supabase/migrations/manifest.json`
- Test: `tests/migration-template.test.ts` (append)

**Interfaces:**
- Consumes: `renderTodoMigration(target, template)` and `APP_ROLE` from
  `src/lib/database/migration-template.ts`.
- Produces: a new manifest entry `REQ-002/002` whose `sha256` is the SHA256 of
  the committed template bytes with `LF` line endings.

Template content (additive and idempotent; it re-asserts the whole target so it
can rebuild it alone, and it upgrades an existing `001` table in place):

```sql
alter table {{TARGET_SCHEMA}}.todos
  add column if not exists due_date date;
```

plus the idempotent schema/table/RLS/grant/policy statements mirrored from
`001`, with `due_date date` included in the `create table if not exists` body.
`due_date` is nullable, has no default, and is never `NOT NULL`, so populated
rows stay valid with `NULL`. No `drop table`, no `drop column`, no
`create schema ... drop`, no rename.

- [ ] **Step 1: Write the failing test**

```ts
describe('002 add due date template', () => {
  it('adds a nullable due_date column without dropping anything', () => {
    const rendered = renderTodoMigration(target, template002);
    expect(rendered).toMatch(/alter table "proto_todo_list_poc"\.todos\s+add column if not exists due_date date/i);
    expect(rendered).not.toMatch(/drop table|drop column|not null due_date/i);
  });

  it('still rebuilds the whole target', () => {
    const rendered = renderTodoMigration(target, template002);
    expect(rendered).toMatch(/create schema if not exists/);
    expect(rendered).toMatch(/enable row level security/);
    expect(rendered).toMatch(/create policy todos_app_role/);
    expect(rendered).toMatch(/grant select, insert, update, delete/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/migration-template.test.ts`
Expected: FAIL - the `002` template file does not exist yet.

- [ ] **Step 3: Write the template and the manifest entry**

Compute the pin from the written file:

```bash
node -e "const c=require('crypto'),f=require('fs');const b=f.readFileSync('supabase/migrations/templates/002_add_todo_due_date.sql.tmpl').toString('utf8').split('\r\n').join('\n');console.log(c.createHash('sha256').update(Buffer.from(b,'utf8')).digest('hex'))"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/migration-template.test.ts`
Expected: PASS, and the real file content hashes to the recorded pin.

- [ ] **Step 5: Commit**

Not performed (coordinator owns commits).

---

### Task 3: Repository boundary normalization

**Files:**
- Modify: `src/lib/todos-repository.ts`
- Test: `tests/todos-repository.test.ts` (new)

**Interfaces:**
- Consumes: `Todo` from `src/lib/todos.ts`.
- Produces:
  - `Todo.dueDate: string | null` (`YYYY-MM-DD` text or `null`).
  - `TodoRepository.setDueDate(ownerToken: string, id: string, dueDate: string | null): Promise<boolean>`.

`pg` returns a `Date` for a `date` column, materialized at local midnight, so
`toDueDateText` must use local getters rather than `toISOString()`, which shifts
the calendar day for any timezone behind UTC. The repository also writes the
validated `YYYY-MM-DD` string as the parameter rather than a JS `Date`, so no
timezone conversion happens on the way in.

- [ ] **Step 1: Write the failing test**

```ts
// The double is shaped from the driver's REAL return type for a `date`
// column: a Date at local midnight. A string-only double cannot catch the
// ISO-normalization bug.
it('normalizes a driver Date to plain calendar text', async () => {
  const queryable = { query: vi.fn().mockResolvedValue({ rows: [{
    id: 'a', title: 'DEMO-REQ-002-20260920-01 task', is_done: false,
    created_at: new Date('2026-09-20T00:00:00.000Z'), due_date: new Date(2026, 8, 18),
  }] }) };
  const todos = await createTodoRepository(queryable, target).list('owner');
  expect(todos[0].dueDate).toBe('2026-09-18');
  expect(typeof todos[0].dueDate).toBe('string');
});

it('keeps a task with no due date as null', async () => {
  const queryable = { query: vi.fn().mockResolvedValue({ rows: [{
    id: 'a', title: 't', is_done: false,
    created_at: new Date('2026-09-20T00:00:00.000Z'), due_date: null,
  }] }) };
  const todos = await createTodoRepository(queryable, target).list('owner');
  expect(todos[0].dueDate).toBeNull();
});

it('clears a due date', async () => {
  const queryable = { query: vi.fn().mockResolvedValue({ rows: [{ id: 'a' }] }) };
  await createTodoRepository(queryable, target).setDueDate('owner', 'a', null);
  expect(queryable.query.mock.calls[0][1]).toEqual(['a', 'owner', null]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/todos-repository.test.ts`
Expected: FAIL - `dueDate` is `undefined`/ISO-shifted and `setDueDate` is not a
function.

- [ ] **Step 3: Write minimal implementation**

Add `due_date` to the select and the insert returning list, add `due_date` to
`DatabaseTodo`, add `toDueDateText`, and add `setDueDate` plus the
`setTodoDueDate` environment helper.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/todos-repository.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Not performed (coordinator owns commits).

---

### Task 4: Server actions, API route, and forms

**Files:**
- Modify: `app/actions.ts`, `app/api/todos/route.ts`, `app/add-todo-form.tsx`
- Test: `tests/todos.test.ts` (covered by `parseCreateTodoInput` cases)

**Interfaces:**
- Consumes: `parseCreateTodoInput`, `validateDueDate`, `setTodoDueDate`.
- Produces: `addTodoAction` accepting an optional `dueDate` field;
  `setDueDateAction(formData)` reading `id` and `dueDate`.

An empty date input submits `''`, which `validateDueDate` maps to `null`. A past
date is accepted (A-3). The add form keeps `id`/`name` `title` and the exact
label `New task` so existing E2E locators keep resolving.

- [ ] **Step 1: Write the failing test**

```ts
it('reads an optional due date from a create request', () => {
  expect(parseCreateTodoInput({ title: 't', dueDate: '2026-09-30' }))
    .toEqual({ ok: true, value: { title: 't', dueDate: '2026-09-30' } });
  expect(parseCreateTodoInput({ title: 't', dueDate: '' }))
    .toEqual({ ok: true, value: { title: 't', dueDate: null } });
  expect(parseCreateTodoInput({ title: 't' }))
    .toEqual({ ok: true, value: { title: 't', dueDate: null } });
});

it('rejects an impossible due date', () => {
  expect(parseCreateTodoInput({ title: 't', dueDate: '2026-02-30' }).ok).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/todos.test.ts`
Expected: FAIL - `parseCreateTodoInput is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add the optional `<input type="date" id="dueDate" name="dueDate">` with label
`Due date (optional)` to the add form, pass `dueDate` through
`addTodoAction` and the `POST` handler, and add `setDueDateAction`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/todos.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Not performed (coordinator owns commits).

---

### Task 5: Row rendering, the overdue mark, and styles

**Files:**
- Create: `app/due-date.tsx`
- Modify: `app/page.tsx`, `app/globals.css`
- Test: `tests/due-date.test.tsx` (new)

**Interfaces:**
- Consumes: `formatDueDate`, `isOverdue`, `localCalendarDate`, `Todo.dueDate`.
- Produces: `<DueDate dueDate={string | null} isDone={boolean} />` rendering
  `data-testid="todo-due-date"` text and, when overdue,
  `data-testid="todo-overdue"`.

The overdue decision runs in an effect so the first client render matches the
server HTML (which cannot know the visitor local day) and no hydration mismatch
occurs.

- [ ] **Step 1: Write the failing test**

```tsx
it('renders the readable date on the server', () => {
  const html = renderToStaticMarkup(<DueDate dueDate="2026-09-30" isDone={false} />);
  expect(html).toContain('30 Sep 2026');
  expect(html).toContain('todo-due-date');
});

it('renders nothing for a task with no due date', () => {
  expect(renderToStaticMarkup(<DueDate dueDate={null} isDone={false} />)).toBe('');
});

it('does not decide overdue before the browser reports its local day', () => {
  const html = renderToStaticMarkup(<DueDate dueDate="2020-01-01" isDone={false} />);
  expect(html).not.toContain('todo-overdue');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/due-date.test.tsx`
Expected: FAIL - cannot resolve `@/app/due-date`.

- [ ] **Step 3: Write minimal implementation**

Add the client `DueDate` component, render it in `TodoRow`, add the row
`dueDate` form (`Save` button, `aria-label` naming the task), and add `.due`,
`.overdue` and date-input styles to `globals.css`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/due-date.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

Not performed (coordinator owns commits).

---

### Task 6: Full local verification

**Files:**
- Create: `specs/REQ-002/plan.md`, `specs/REQ-002/tasks.md` (internal SDD)

- [ ] **Step 1: Run the whole unit suite**

Run: `npm test`
Expected: PASS, all suites, including the untouched REQ-001 tests.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: clean.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Confirm the preserved E2E artifacts are unchanged**

Run: `git status --short e2e playwright.config.ts`
Expected: no output.

### Task 7: Make the serialized script survive the production build

Observed defect: the mark never appeared in a real browser although the unit
suite, typecheck and build were all green. Cause: the minifier renamed the
serialized function bodies' references to module-scope bindings
(`isOverdue` -> `e`, `localCalendarDate` -> `d`, `DUE_DATE_ATTRIBUTE` -> `c`,
`OVERDUE_TESTID` -> `b`) while leaving the emitted `var` declarations in their
long form, so the script threw `c is not defined` in the browser only.

Fix: `revealOverdueMarks` now receives every value as a parameter, so its
serialized body has no free identifier. `src/lib/overdue-mark.ts` must not
import anything, because a bundler rewrites an imported binding inside a
serialized body into a module-loader reference.

Verification: `tests/due-date.test.tsx` asserts the emitted script carries no
module-loader reference and that the wiring references no free module name;
both fail on the pre-fix code. The real production script, extracted from
`next start`, was then run in Chromium under UTC, Asia/Shanghai,
America/New_York, Pacific/Kiritimati and Pacific/Midway: 25/25 checks pass.

## Self-Review

**Spec coverage**

- AC-001 (optional date on the add form): Task 4 - the form gains an optional
  date input and an empty value is accepted.
- AC-002 (date shown readably): Task 5 - `formatDueDate` plus the server-rendered
  `todo-due-date` text.
- AC-003 (open task past its date shows overdue): Task 1 decides it from
  calendar dates; Task 5 renders the mark on the row.
- AC-004 (done is never overdue): Task 1, `isOverdue` returns false when
  `isDone`.
- AC-005 (change or clear on the row): Task 3 `setDueDate` plus Task 5 row form.
- AC-006 (no date unchanged): Task 3 returns `null`, Task 5 renders nothing, and
  the order and summary code are untouched.
- A-1 (visitor local day): Task 1 `localCalendarDate` uses local getters and the
  decision runs in the browser (Task 5).
- A-2 (date only): the column is `date`, Task 2.
- A-3 (past date allowed): Task 1 `validateDueDate` accepts past dates.
- A-4 (no re-sort): the `order by created_at desc` query is unchanged.
- A-5/A-6 (row-level controls): Task 5.
- EX-N-003 (done then open shows overdue again): `isDone` is an effect
  dependency in Task 5.

**Placeholder scan:** no `TBD`/`TODO`/"handle edge cases" steps; each code step
shows the actual content.

**Type consistency:** `Todo.dueDate` is `string | null` everywhere;
`setDueDate(ownerToken, id, dueDate)` and `setTodoDueDate` share that signature;
`isOverdue(dueDate, isDone, today)` has one shape across Task 1 and Task 5.
