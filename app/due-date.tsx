'use client';

import { formatDueDate } from '@/src/lib/todos';
import { DUE_DATE_ATTRIBUTE, OVERDUE_TESTID } from '@/src/lib/overdue-mark';

/**
 * The due date on a task row.
 *
 * The date text is rendered on the server so it is present without JavaScript.
 * The overdue mark is rendered hidden and revealed by the inline script that
 * `app/page.tsx` emits after the list, because only the browser knows the
 * visitor's local calendar day. A done task gets no mark at all, so it can
 * never be shown as overdue.
 */
export function DueDate({ dueDate, isDone }: { dueDate: string | null; isDone: boolean }) {
  if (dueDate === null) return null;

  return (
    <span className="due" data-testid="todo-due-date" {...{ [DUE_DATE_ATTRIBUTE]: dueDate }}>
      {formatDueDate(dueDate)}
      {isDone ? null : (
        <span className="overdue" data-testid={OVERDUE_TESTID} hidden>
          Overdue
        </span>
      )}
    </span>
  );
}
