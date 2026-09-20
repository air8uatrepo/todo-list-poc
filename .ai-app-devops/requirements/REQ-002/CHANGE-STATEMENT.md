# REQ-002 change statement

The todo list lets a visitor record tasks in their own browser without
registering. Today every task looks equally urgent, because a task cannot carry
a date.

This change adds an **optional due date** to a task.

- When a visitor adds a task they may also pick a due date. Leaving it empty is
  allowed, and staying empty is the normal case.
- A task that has a due date shows that date in the list.
- An open task whose due date has already passed is visibly marked as overdue,
  so a glance at the list shows what needs attention first.
- A task that is done is never marked as overdue, even when its date has passed.
- A due date can be changed or removed again after it has been set, so it stays
  optional for the whole life of the task.
- A task with no due date behaves exactly as it does today.

## This change does not

It does not add reminders, notifications, alarms, recurring tasks, start dates,
a calendar view, or priority levels. It does not sort or group the list by due
date, and it does not change the order tasks are shown in. It does not add
sign-in, accounts, sharing a list between people, or collaboration. It does not
carry a task between browsers or devices, because the owner token lives in one
browser.

**Status:** draft for business review - not yet confirmed