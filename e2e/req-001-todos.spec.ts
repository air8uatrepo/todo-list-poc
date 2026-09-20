import { expect, test, type Page } from '@playwright/test';
import { syntheticPrefix, uniqueRunToken } from './synthetic-prefix';

/**
 * Key-path E2E for REQ-001, retained as cumulative regression coverage.
 *
 * Assertions are anchored on `data-testid` elements and exact text rather than
 * on a broad role locator: a locator that can match zero elements makes every
 * assertion vacuously true, which is how a broken page passes a green run.
 * Every count assertion below therefore also proves the element is present.
 *
 * The fixture prefix comes from the shared per-requirement table, so this spec
 * asserts on REQ-001's own approved prefix. A per-run suffix keeps each row
 * unambiguous once a shared POC database accumulates rows across runs.
 */

const RUN_TOKEN = uniqueRunToken();

function taskName(label: string): string {
  return `${syntheticPrefix('REQ-001')} ${label} ${RUN_TOKEN}`;
}

async function addTask(page: Page, title: string): Promise<void> {
  await page.getByLabel('New task').fill(title);
  await page.getByRole('button', { name: 'Add task' }).click();
}

test('a visitor can add, persist, complete, and delete their own task', async ({ page }) => {
  const first = taskName('buy synthetic milk');

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'My Todos' })).toBeVisible();

  // The page is interactive before any data exists.
  await expect(page.getByTestId('todo-summary')).toHaveText('Nothing here yet.');

  await addTask(page, first);

  // The new task is visible, and it is visible as persisted data, not as a
  // client-side echo: the page re-renders from the database on reload.
  await expect(page.getByTestId('todo-title').filter({ hasText: first })).toHaveCount(1);

  await page.reload();
  await expect(page.getByTestId('todo-title').filter({ hasText: first })).toHaveCount(1);
  await expect(page.getByTestId('todo-summary')).toContainText('1 open of 1 total.');

  // Completing a task persists too.
  await page.getByRole('button', { name: `Mark ${first} as done` }).click();
  await expect(page.getByRole('button', { name: `Mark ${first} as not done` })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: `Mark ${first} as not done` })).toBeVisible();
  await expect(page.getByTestId('todo-summary')).toContainText('0 open of 1 total.');

  // Deleting a task persists too.
  await page.getByRole('button', { name: `Delete ${first}` }).click();
  await expect(page.getByTestId('todo-title').filter({ hasText: first })).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('todo-title').filter({ hasText: first })).toHaveCount(0);
  await expect(page.getByTestId('todo-summary')).toHaveText('Nothing here yet.');
});

test('an empty title is rejected', async ({ page }) => {
  await page.goto('/');

  // A whitespace-only title is not a task. The form must refuse it rather than
  // storing a blank row.
  await page.getByLabel('New task').fill('   ');
  await page.getByRole('button', { name: 'Add task' }).click();

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByTestId('todo-summary')).toHaveText('Nothing here yet.');
});

test('one visitor cannot see another visitor list', async ({ browser }) => {
  const ownerTitle = taskName('private to owner');

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto('/');
  await addTask(ownerPage, ownerTitle);
  await expect(ownerPage.getByTestId('todo-title').filter({ hasText: ownerTitle })).toHaveCount(1);

  // A separate context has no owner cookie, so it is a different visitor with
  // its own list. This is the whole ownership guarantee: no registration, but
  // no shared list either.
  const strangerContext = await browser.newContext();
  const strangerPage = await strangerContext.newPage();
  await strangerPage.goto('/');
  await expect(strangerPage.getByTestId('todo-title').filter({ hasText: ownerTitle })).toHaveCount(0);
  await expect(strangerPage.getByTestId('todo-summary')).toHaveText('Nothing here yet.');

  // Clean up so the run leaves no residue.
  await ownerPage.getByRole('button', { name: `Delete ${ownerTitle}` }).click();
  await expect(ownerPage.getByTestId('todo-title').filter({ hasText: ownerTitle })).toHaveCount(0);

  await ownerContext.close();
  await strangerContext.close();
});
