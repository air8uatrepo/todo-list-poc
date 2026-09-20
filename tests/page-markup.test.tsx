import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('server-only', () => ({}));

// Stub the data layer so the real HomePage/TodoRow markup can be rendered and
// checked against the locators the preserved REQ-001 E2E suite depends on.
vi.mock('@/src/lib/todos-repository', () => ({
  listTodos: vi.fn().mockResolvedValue([
    {
      id: '0b6f0f4e-0000-4000-8000-000000000001',
      title: 'DEMO-REQ-002-20260920-01 renew insurance',
      isDone: false,
      createdAt: '2026-09-20T04:30:00.000Z',
      dueDate: '2026-09-30',
    },
    {
      id: '0b6f0f4e-0000-4000-8000-000000000002',
      title: 'DEMO-REQ-002-20260920-01 book venue',
      isDone: true,
      createdAt: '2026-09-20T04:29:00.000Z',
      dueDate: null,
    },
  ]),
}));

vi.mock('@/src/lib/identity', () => ({
  readOwnerToken: vi.fn().mockResolvedValue('owner-token'),
}));

vi.mock('@/app/actions', () => ({
  addTodoAction: async () => ({ error: null }),
  toggleTodoAction: async () => undefined,
  removeTodoAction: async () => undefined,
  setDueDateAction: async () => undefined,
}));

import HomePage from '@/app/page';

async function renderedPage(): Promise<string> {
  return renderToStaticMarkup(await HomePage());
}

describe('the page markup keeps the earlier key paths intact', () => {
  it('still exposes the add-task form with its New task label', async () => {
    const html = await renderedPage();
    expect(html).toContain('My Todos');
    expect(html).toMatch(/for="title"[^>]*>New task</);
    expect(html).toContain('name="title"');
    expect(html).toContain('Add task');
  });

  it('still exposes the summary line and the row test ids', async () => {
    const html = await renderedPage();
    expect(html).toContain('data-testid="todo-summary"');
    expect(html).toContain('1 open of 2 total.');
    expect(html).toContain('data-testid="todo-row"');
    expect(html).toContain('data-testid="todo-title"');
  });

  it('keeps the toggle and delete accessible names the E2E suite uses', async () => {
    const html = await renderedPage();
    const title = 'DEMO-REQ-002-20260920-01 renew insurance';
    expect(html).toContain(`aria-label="Mark ${title} as done"`);
    expect(html).toContain(`aria-label="Delete ${title}"`);
  });

  it('shows the due date and marks the row data for the overdue script', async () => {
    const html = await renderedPage();
    expect(html).toContain('30 Sep 2026');
    expect(html).toContain('data-due-date="2026-09-30"');
  });

  it('emits the overdue script after the list', async () => {
    const html = await renderedPage();
    expect(html).toContain('data-due-date');
    expect(html.indexOf('getFullYear()')).toBeGreaterThan(html.indexOf('todo-list'));
  });
});
