import { describe, expect, it, vi } from 'vitest';

// `todos-repository` imports `server-only`, which throws outside a React Server
// Component. Replacing it here lets the real repository code run under Vitest.
vi.mock('server-only', () => ({}));

import { createTodoRepository } from '@/src/lib/todos-repository';
import { resolveDatabaseTarget } from '@/src/lib/database/target-schema';

const target = resolveDatabaseTarget({
  BUSINESS_DIRECT_DATABASE_URL: 'postgres://example',
  BUSINESS_DIRECT_DEPLOYMENT_TIER: 'proto',
  BUSINESS_DIRECT_DATABASE_SCHEMA: 'proto_todo_list_poc',
});

type Row = {
  id: string;
  title: string;
  is_done: boolean;
  created_at: string | Date;
  due_date: string | Date | null;
};

function queryableReturning(rows: Row[]) {
  const query = vi.fn().mockResolvedValue({ rows });
  return { queryable: { query }, query };
}

/**
 * A row shaped from the DRIVER's real return types.
 *
 * `pg` materializes a `date` column as a `Date` at LOCAL midnight and a
 * `timestamptz` as a `Date`. A double that hands back a convenient string for
 * the due date cannot catch the bug this suite exists to prevent, because it
 * never produces the value that reaches the component in production.
 */
function driverRow(overrides: Partial<Row> = {}): Row {
  return {
    id: '0b6f0f4e-0000-4000-8000-000000000001',
    title: 'DEMO-REQ-002-20260920-01 renew insurance',
    is_done: false,
    created_at: new Date('2026-09-20T04:30:00.000Z'),
    due_date: new Date(2026, 8, 18),
    ...overrides,
  };
}

/**
 * Run a body with the given runtime timezone, restoring the previous one.
 *
 * A zone AHEAD of UTC is what makes the difference observable: local midnight
 * lands on the previous UTC day, so a naive `toISOString()` reports the wrong
 * calendar date in every one of these zones, whatever the host timezone is.
 */
async function withTimeZone<T>(zone: string, body: () => Promise<T>): Promise<T> {
  const previous = process.env.TZ;
  process.env.TZ = zone;
  try {
    return await body();
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

describe('listTodos normalization', () => {
  it('turns a driver Date due date into plain calendar text', async () => {
    const { queryable } = queryableReturning([driverRow()]);

    const todos = await createTodoRepository(queryable, target).list('owner');

    expect(todos[0].dueDate).toBe('2026-09-18');
    expect(typeof todos[0].dueDate).toBe('string');
  });

  it('keeps the same calendar day in a timezone ahead of UTC', async () => {
    // `toISOString()` would report 2026-09-17 here, because local midnight in
    // Asia/Shanghai is the previous day in UTC. This is the deployment trap:
    // the server runs in UTC while the visitor does not.
    const todos = await withTimeZone('Asia/Shanghai', async () => {
      const { queryable } = queryableReturning([driverRow()]);
      return createTodoRepository(queryable, target).list('owner');
    });

    expect(todos[0].dueDate).toBe('2026-09-18');
  });

  it('keeps the same calendar day in a far-ahead timezone across a year boundary', async () => {
    const todos = await withTimeZone('Pacific/Kiritimati', async () => {
      const { queryable } = queryableReturning([driverRow({ due_date: new Date(2026, 0, 1) })]);
      return createTodoRepository(queryable, target).list('owner');
    });

    expect(todos[0].dueDate).toBe('2026-01-01');
  });

  it('keeps a task with no due date as null', async () => {
    const { queryable } = queryableReturning([driverRow({ due_date: null })]);

    const todos = await createTodoRepository(queryable, target).list('owner');

    expect(todos[0].dueDate).toBeNull();
  });

  it('accepts a driver that returns the date as text', async () => {
    const { queryable } = queryableReturning([driverRow({ due_date: '2026-09-18' })]);

    const todos = await createTodoRepository(queryable, target).list('owner');

    expect(todos[0].dueDate).toBe('2026-09-18');
  });

  it('requests the due date column in the list query', async () => {
    const { queryable, query } = queryableReturning([]);
    await createTodoRepository(queryable, target).list('owner');
    expect(String(query.mock.calls[0][0])).toMatch(/due_date/);
  });
});

describe('createTodo with a due date', () => {
  it('sends the due date as plain text and returns normalized text', async () => {
    const { queryable, query } = queryableReturning([driverRow()]);

    const todo = await createTodoRepository(queryable, target).create('owner', 't', '2026-09-18');

    expect(query.mock.calls[0][1]).toEqual(['owner', 't', '2026-09-18']);
    expect(todo.dueDate).toBe('2026-09-18');
  });

  it('sends null when there is no due date', async () => {
    const { queryable, query } = queryableReturning([driverRow({ due_date: null })]);

    await createTodoRepository(queryable, target).create('owner', 't', null);

    expect(query.mock.calls[0][1]).toEqual(['owner', 't', null]);
  });
});

describe('setDueDate', () => {
  it('updates the due date for the owner and reports whether it landed', async () => {
    const { queryable, query } = queryableReturning([]);

    const updated = await createTodoRepository(queryable, target).setDueDate('owner', 'todo-id', '2026-09-30');

    expect(updated).toBe(false);
    expect(String(query.mock.calls[0][0])).toMatch(/set due_date = \$3/i);
    expect(query.mock.calls[0][1]).toEqual(['todo-id', 'owner', '2026-09-30']);
  });

  it('clears the due date with null', async () => {
    const { queryable, query } = queryableReturning([{ id: 'todo-id' } as Row]);

    const updated = await createTodoRepository(queryable, target).setDueDate('owner', 'todo-id', null);

    expect(updated).toBe(true);
    expect(query.mock.calls[0][1]).toEqual(['todo-id', 'owner', null]);
  });
});
