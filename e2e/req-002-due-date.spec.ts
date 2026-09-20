import { expect, test, type Locator, type Page } from '@playwright/test';
import { syntheticPrefix, uniqueRunToken } from './synthetic-prefix';

/**
 * Key-path E2E for REQ-002: E2E-KP-REQ-002-001.
 *
 * Baseline: `specs/REQ-002/spec.md` revision 1 (confirmed 2026-09-20).
 * Covers the confirmed user journey as the visitor actually experiences it,
 * without an artificial reload between steps: AC-001 (add with and without a
 * date), AC-002 (the date shows readably on the row), AC-003 (an open task past
 * its date is marked overdue, EX-E-001), AC-004 (a done task never is,
 * EX-E-002), AC-005 with EX-N-003 (the date can be changed, the task re-opened,
 * and the date cleared), AC-006 with EX-EMPTY-002 (a task with no date shows no
 * date and no mark).
 *
 * Assertion integrity (per the tester skill):
 * - A "hidden" or "absent" assertion is only evidence when the same locator is
 *   proven to resolve on a passing path. Here the future-dated mark is asserted
 *   to resolve to exactly one element before it is asserted hidden, and the
 *   overdue mark is asserted visible before any absence assertion on its
 *   locator, so neither a missing element nor a broken locator passes vacuously.
 * - The row this run created carries a per-run suffix, so a shared POC database
 *   that accumulates rows across runs cannot make the text lookup ambiguous.
 * - The overdue decision belongs to the visitor's own calendar day, so dates are
 *   computed from the browser's local clock, and the expected display text is
 *   re-derived here from the spec rule rather than imported from the application
 *   (an imported expectation would make the case agree with any bug).
 */

const RUN_TOKEN = uniqueRunToken();

function taskName(label: string): string {
  return `${syntheticPrefix('REQ-002')} ${label} ${RUN_TOKEN}`;
}

/** The visitor's own local calendar day, shifted by `offsetDays`. */
async function browserLocalDay(page: Page, offsetDays: number): Promise<string> {
  return page.evaluate((offset) => {
    const now = new Date();
    now.setDate(now.getDate() + offset);
    const month = now.getMonth() + 1;
    const day = now.getDate();
    return `${now.getFullYear()}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
  }, offsetDays);
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Independently re-derive the readable form the spec asks for. */
function expectedDateText(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${Number(day)} ${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

function rowFor(page: Page, title: string): Locator {
  return page.getByTestId('todo-row').filter({ hasText: title });
}

async function addTask(page: Page, title: string, dueDate?: string): Promise<void> {
  await page.getByLabel('New task').fill(title);
  if (dueDate !== undefined) {
    await page.getByLabel('Due date (optional)').fill(dueDate);
  }
  await page.getByRole('button', { name: 'Add task' }).click();
}

/**
 * Save a due date on the row itself.
 *
 * The row input is located by its own `name` inside the row rather than by
 * label text: the row label is "Due date for <title>" and the Save button's
 * accessible name is "Save due date for <title>", which contains that label as
 * a substring, so a label lookup resolves two elements.
 */
async function saveRowDueDate(page: Page, title: string, dueDate: string): Promise<void> {
  await rowFor(page, title).locator('input[name="dueDate"]').fill(dueDate);
  await page.getByRole('button', { name: `Save due date for ${title}` }).click();
}

test('E2E-KP-REQ-002-001 a visitor sees a due date, its overdue mark, and can change or clear it', async ({ page }) => {
  const future = taskName('beyond');
  const overdue = taskName('already');
  const undated = taskName('unset');
  const created = [future, overdue, undated];

  const futureDate = await browserLocalDay(page, 30);
  const pastDate = await browserLocalDay(page, -1);
  const laterPastDate = await browserLocalDay(page, -2);

  try {
    await test.step('an empty list is shown to a fresh visitor', async () => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'My Todos' })).toBeVisible();
      await expect(page.getByTestId('todo-summary')).toHaveText('Nothing here yet.');
    });

    await test.step('AC-001, AC-002: a task added with a due date shows that date readably and is not overdue', async () => {
      await addTask(page, future, futureDate);
      const futureRow = rowFor(page, future);
      await expect(futureRow).toHaveCount(1);
      await expect(futureRow.getByTestId('todo-due-date')).toContainText(expectedDateText(futureDate));
      // The mark element exists for an open dated task, but a future date is not
      // overdue. The count assertion proves the locator resolves to a real
      // element, so the hidden assertion cannot pass by finding nothing.
      await expect(futureRow.getByTestId('todo-overdue')).toHaveCount(1);
      await expect(futureRow.getByTestId('todo-overdue')).toBeHidden();
    });

    await test.step('AC-001, AC-006: a task added with no date shows no date and no mark', async () => {
      await addTask(page, undated);
      const undatedRow = rowFor(page, undated);
      await expect(undatedRow).toHaveCount(1);
      await expect(undatedRow.getByTestId('todo-due-date')).toHaveCount(0);
      await expect(undatedRow.getByTestId('todo-overdue')).toHaveCount(0);
      await expect(page.getByTestId('todo-summary')).toContainText('2 open of 2 total.');
    });

    await test.step('AC-003, EX-E-001: an open task past its date is marked overdue as soon as it is listed', async () => {
      await addTask(page, overdue, pastDate);
      const overdueRow = rowFor(page, overdue);
      await expect(overdueRow).toHaveCount(1);
      await expect(overdueRow.getByTestId('todo-due-date')).toContainText(expectedDateText(pastDate));
      // The visitor has not reloaded: this is the mark as the flow shows it.
      await expect(overdueRow.getByTestId('todo-overdue')).toBeVisible();
    });

    await test.step('AC-002, AC-003 persistence readback after a reload', async () => {
      await page.reload();
      await expect(rowFor(page, future).getByTestId('todo-due-date')).toContainText(expectedDateText(futureDate));
      await expect(rowFor(page, future).getByTestId('todo-overdue')).toBeHidden();
      await expect(rowFor(page, overdue).getByTestId('todo-due-date')).toContainText(expectedDateText(pastDate));
      await expect(rowFor(page, overdue).getByTestId('todo-overdue')).toBeVisible();
      await expect(rowFor(page, undated).getByTestId('todo-due-date')).toHaveCount(0);
    });

    await test.step('AC-004, EX-E-002: a done task past its date is never overdue', async () => {
      await page.getByRole('button', { name: `Mark ${overdue} as done` }).click();
      await expect(page.getByRole('button', { name: `Mark ${overdue} as not done` })).toBeVisible();
      await expect(rowFor(page, overdue).getByTestId('todo-due-date')).toContainText(expectedDateText(pastDate));
      // A done task renders no mark at all. This absence assertion is anchored by
      // the same row's mark resolving visible in the previous step.
      await expect(rowFor(page, overdue).getByTestId('todo-overdue')).toHaveCount(0);
      await expect(page.getByTestId('todo-summary')).toContainText('2 open of 3 total.');
    });

    await test.step('EX-N-003: re-opening the task shows the overdue mark again', async () => {
      await page.getByRole('button', { name: `Mark ${overdue} as not done` }).click();
      await expect(page.getByRole('button', { name: `Mark ${overdue} as done` })).toBeVisible();
      await expect(rowFor(page, overdue).getByTestId('todo-overdue')).toBeVisible();
    });

    await test.step('AC-005: an existing task can be given a date on its row, and the mark follows it', async () => {
      await saveRowDueDate(page, undated, laterPastDate);
      await expect(rowFor(page, undated).getByTestId('todo-due-date')).toHaveCount(1);
      await expect(rowFor(page, undated).getByTestId('todo-due-date')).toContainText(expectedDateText(laterPastDate));
      await expect(rowFor(page, undated).getByTestId('todo-overdue')).toBeVisible();
    });

    await test.step('AC-005, EX-EMPTY-002: clearing the date leaves no date and no mark', async () => {
      await saveRowDueDate(page, future, '');
      await expect(rowFor(page, future).getByTestId('todo-due-date')).toHaveCount(0);
      await expect(rowFor(page, future).getByTestId('todo-overdue')).toHaveCount(0);
    });

    await test.step('AC-005 persistence readback after a reload', async () => {
      await page.reload();
      await expect(rowFor(page, future).getByTestId('todo-due-date')).toHaveCount(0);
      await expect(rowFor(page, future).getByTestId('todo-overdue')).toHaveCount(0);
      await expect(rowFor(page, undated).getByTestId('todo-due-date')).toContainText(expectedDateText(laterPastDate));
      await expect(rowFor(page, undated).getByTestId('todo-overdue')).toBeVisible();
    });
  } finally {
    // Leave no residue in the shared test schema, even when an assertion above
    // failed. The owner token is per-run, but a clean list is stronger evidence.
    for (const title of created) {
      const deleteButton = page.getByRole('button', { name: `Delete ${title}` });
      try {
        if (await deleteButton.count() > 0) {
          await deleteButton.first().click({ timeout: 5_000 });
          await expect(rowFor(page, title)).toHaveCount(0, { timeout: 5_000 });
        }
      } catch {
        // Best-effort cleanup; a failure here must not mask the real result.
      }
    }
  }
});
