export { isOverdue, localCalendarDate } from './overdue-mark';

export type Todo = {
  id: string;
  title: string;
  isDone: boolean;
  createdAt: string;
  /** Calendar due date as `YYYY-MM-DD`, or null when the task has none. */
  dueDate: string | null;
};

export type TodoValidation =
  | { ok: true; value: { title: string } }
  | { ok: false; fieldErrors: { title: string } };

export const TITLE_MAX_LENGTH = 200;

export function validateTodoTitle(raw: unknown): TodoValidation {
  if (typeof raw !== 'string') {
    return { ok: false, fieldErrors: { title: 'Enter a task.' } };
  }
  const title = raw.trim();
  if (title === '') {
    return { ok: false, fieldErrors: { title: 'Enter a task.' } };
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return { ok: false, fieldErrors: { title: `Use ${TITLE_MAX_LENGTH} characters or fewer.` } };
  }
  return { ok: true, value: { title } };
}

/**
 * Read only the title from a create request.
 *
 * Kept as the title-only view of `parseCreateTodoInput`, so the title rule has
 * exactly one implementation. Any due date in the same body is ignored here.
 */
export function parseCreateTodoBody(body: unknown): TodoValidation {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, fieldErrors: { title: 'Enter a task.' } };
  }
  return validateTodoTitle((body as { title?: unknown }).title);
}

/**
 * The due date is a calendar date, not an instant. It is stored, compared and
 * displayed as plain `YYYY-MM-DD` text so no timezone conversion can move it to
 * another day. `pg` materializes a `date` column as a `Date` at local midnight,
 * so the repository boundary converts it back to this text form.
 */
export const DUE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Render `YYYY-MM-DD` readably, from the date parts alone. */
export function formatDueDate(dueDate: string): string {
  const match = DUE_DATE_PATTERN.exec(dueDate);
  if (match === null) return dueDate;
  return `${Number(match[3])} ${MONTH_NAMES[Number(match[2]) - 1]} ${match[1]}`;
}

export type DueDateValidation =
  | { ok: true; value: { dueDate: string | null } }
  | { ok: false; fieldErrors: { dueDate: string } };

const dueDateError = 'Choose a real date, or leave it empty.';

/**
 * Validate an optional due date.
 *
 * Empty or absent means no due date and is always allowed. A well-formed date
 * is accepted even when it is in the past, because a past date is a legitimate
 * thing to record. A malformed or impossible date is refused rather than
 * silently stored.
 */
export function validateDueDate(raw: unknown): DueDateValidation {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true, value: { dueDate: null } };
  }
  if (typeof raw !== 'string') {
    return { ok: false, fieldErrors: { dueDate: dueDateError } };
  }

  const value = raw.trim();
  if (value === '') {
    return { ok: true, value: { dueDate: null } };
  }

  const match = DUE_DATE_PATTERN.exec(value);
  if (match === null) {
    return { ok: false, fieldErrors: { dueDate: dueDateError } };
  }

  // Reject a calendar day that does not exist, such as 30 February. The check
  // uses UTC parts so it cannot depend on the runtime timezone.
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year
    || probe.getUTCMonth() !== month - 1
    || probe.getUTCDate() !== day
  ) {
    return { ok: false, fieldErrors: { dueDate: dueDateError } };
  }

  return { ok: true, value: { dueDate: value } };
}

export type TodoInputValidation =
  | { ok: true; value: { title: string; dueDate: string | null } }
  | { ok: false; fieldErrors: { title: string } & { dueDate?: string } };

/**
 * Parse a create request: a required title plus an optional due date.
 *
 * The due date is validated by the same rule the row editor uses, so an empty
 * choice and an absent field both mean "no due date" and a past date is still
 * accepted.
 */
export function parseCreateTodoInput(body: unknown): TodoInputValidation {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, fieldErrors: { title: 'Enter a task.' } };
  }

  const title = validateTodoTitle((body as { title?: unknown }).title);
  if (!title.ok) {
    return { ok: false, fieldErrors: title.fieldErrors };
  }

  const dueDate = validateDueDate((body as { dueDate?: unknown }).dueDate);
  if (!dueDate.ok) {
    return { ok: false, fieldErrors: { title: "", ...dueDate.fieldErrors } };
  }

  return { ok: true, value: { title: title.value.title, dueDate: dueDate.value.dueDate } };
}
