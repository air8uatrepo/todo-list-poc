# REQ-002 - Optional due date on a task

**Status:** Confirmed by the Business App Owner on 2026-09-20
**Application:** todo-list-poc
**Project mode:** EXISTING
**Run ID:** `DEMO-REQ-002-20260920-01`

## Goal

Let a visitor say when a task is due, so the list can be scanned to see what
needs attention first instead of treating every task as equally urgent.

## In scope

- An optional due date on a task. A visitor may pick a date when adding a
  task, and leaving it empty stays allowed and remains the normal case.
- The due date is shown on the task in the list.
- An open task whose due date has already passed is visibly marked as overdue.
- A due date can be changed or cleared after it has been set, so it stays
  optional for the whole life of the task.
- A task with no due date keeps behaving exactly as it does today.

## Acceptance criteria

- **AC-001:** The add-task form offers an optional due-date choice next to the
  task name. A task can be added with the due date left empty, and that
  succeeds as it does today.
- **AC-002:** A task saved with a due date shows that date on its row in the
  list, in a readable date form.
- **AC-003:** An open task whose due date is earlier than today's date is
  visibly marked as overdue on its row, in addition to showing the date.
- **AC-004:** A task that is marked done is never shown as overdue, even when
  its due date has passed.
- **AC-005:** An existing task's due date can be changed to a different date,
  and can be cleared, after which the task shows no date and no overdue mark.
- **AC-006:** A task with no due date shows no date and no overdue mark, and
  every existing behaviour of such a task is unchanged.

## Business assumptions

These are the assumptions the draft is built on. Any of them can be corrected.

- **A-1:** "Today" means the visitor's own calendar day as their browser shows
  it. Overdue is decided by calendar date, not by time of day, so a task due
  today is not overdue.
- **A-2:** Only the date matters. The time of day a task is due is not
  recorded or shown.
- **A-3:** A date in the past may be chosen. The form does not refuse a past
  date.
- **A-4:** The list keeps the order it uses today. Overdue tasks are marked,
  not re-sorted to the top.
- **A-5:** The due date is set or changed on the task row itself, so an
  existing task can be given a date later.
- **A-6:** The overdue mark is shown on the task row, and the task stays
  otherwise unchanged: it can still be marked done or deleted as today.

## Examples

- **EX-N-001:** Add a task named "Renew insurance" with due date 30 Sep 2026.
  The list shows the task with `30 Sep 2026` and no overdue mark.
- **EX-N-002:** Add a task named "Book venue" with the due date left empty.
  The list shows the task with no date and no overdue mark.
- **EX-E-001:** A task is due 18 Sep 2026 and today is 20 Sep 2026. The task
  is open, so its row shows the date and an overdue mark.
- **EX-E-002:** The same task is marked done on 20 Sep 2026. Its row shows the
  date but no overdue mark.
- **EX-N-003:** A task due 18 Sep 2026 that is marked done and then marked open
  again on 20 Sep 2026 shows the overdue mark again.
- **EX-EMPTY-001:** A visitor with no tasks sees the list exactly as today.
- **EX-EMPTY-002:** Clearing the due date of "Renew insurance" leaves the task
  with no date and no overdue mark.

## This change does not

It does not add reminders, notifications, alarms, recurring tasks, start dates,
a calendar view, or priority levels. It does not sort or group the list by due
date, and it does not change the order tasks are shown in. It does not add
sign-in, accounts, sharing a list between people, or collaboration. It does not
carry a task between browsers or devices, because the owner token lives in one
browser.
