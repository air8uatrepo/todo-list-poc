# REQ-001 change statement

The application provides a minimal personal todo list. Anyone can open it and
record their own tasks without registering. Each visitor is initialized with an
opaque owner token on first use, and every task is scoped to that token, so one
visitor cannot see another visitor's tasks. A task can be added, marked done or
not done, and deleted.

## This change does not

It does not support user accounts, sign-in, sharing a list between people,
collaboration, due dates, reminders, priorities, tags, attachments, or search.
It does not carry a task between browsers or devices, because the owner token
lives in one browser.

**Confirmed by:** Business App Owner, 2026-09-19 (Auto-Gated)
