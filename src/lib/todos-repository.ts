import 'server-only';

import type { Todo } from './todos';
import { createTodoPool, type Queryable } from './database/pool';
import { assertDatabaseTarget, resolveDatabaseTarget, type DatabaseTarget } from './database/target-schema';

export type { Queryable } from './database/pool';

type DatabaseTodo = {
  id: string;
  title: string;
  is_done: boolean;
  created_at: string | Date;
  due_date: string | Date | null;
};

// The `pg` driver materializes `timestamptz` as a `Date`, while the UI needs a
// stable text form. Normalizing here keeps a raw `Date` from reaching React,
// which cannot render it as a child and fails at render time rather than at
// query time.
function toCreatedAtText(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Normalize the `date` column to plain `YYYY-MM-DD` text.
 *
 * `pg` materializes a `date` as a `Date` at LOCAL midnight. Calling
 * `toISOString()` here would convert to UTC and report the previous calendar
 * day for any timezone behind UTC, so the value is read back from the local
 * getters, which are exactly the parts the driver built it from. A `date` is a
 * calendar date, not an instant, so no timezone conversion is correct here.
 */
function toDueDateText(value: string | Date | null): string | null {
  if (value === null) return null;
  if (!(value instanceof Date)) return value;
  const month = value.getMonth() + 1;
  const day = value.getDate();
  return `${value.getFullYear()}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
}

function toTodo(row: DatabaseTodo): Todo {
  return {
    id: row.id,
    title: row.title,
    isDone: row.is_done,
    createdAt: toCreatedAtText(row.created_at),
    dueDate: toDueDateText(row.due_date),
  };
}

function recordOperationFailure(operationId: string): void {
  console.error({ operationId });
}

const todoColumns = 'id, title, is_done, created_at, due_date';

export type TodoRepository = {
  list(ownerToken: string): Promise<Todo[]>;
  create(ownerToken: string, title: string, dueDate: string | null): Promise<Todo>;
  setDone(ownerToken: string, id: string, isDone: boolean): Promise<boolean>;
  setDueDate(ownerToken: string, id: string, dueDate: string | null): Promise<boolean>;
  remove(ownerToken: string, id: string): Promise<boolean>;
};

export function createTodoRepository(queryable: Queryable, target: DatabaseTarget): TodoRepository {
  assertDatabaseTarget(target);

  return {
    async list(ownerToken) {
      const operationId = crypto.randomUUID();
      try {
        const result = await queryable.query<DatabaseTodo>(
          `select ${todoColumns} from ${target.tableSql} where owner_token = $1 order by created_at desc`,
          [ownerToken],
        );
        return result.rows.map(toTodo);
      } catch {
        recordOperationFailure(operationId);
        throw new Error('Todo retrieval failed.');
      }
    },

    async create(ownerToken, title, dueDate) {
      const operationId = crypto.randomUUID();
      try {
        // The due date travels as plain `YYYY-MM-DD` text so PostgreSQL casts
        // it to `date` directly, with no client-side timezone conversion.
        const result = await queryable.query<DatabaseTodo>(
          `insert into ${target.tableSql} (owner_token, title, due_date) values ($1, $2, $3) returning ${todoColumns}`,
          [ownerToken, title, dueDate],
        );
        const row = result.rows[0];
        if (row === undefined) throw new Error('No todo returned.');
        return toTodo(row);
      } catch {
        recordOperationFailure(operationId);
        throw new Error('Todo persistence failed.');
      }
    },

    async setDone(ownerToken, id, isDone) {
      const operationId = crypto.randomUUID();
      try {
        const result = await queryable.query<{ id: string }>(
          `update ${target.tableSql} set is_done = $3 where id = $1 and owner_token = $2 returning id`,
          [id, ownerToken, isDone],
        );
        return result.rows.length > 0;
      } catch {
        recordOperationFailure(operationId);
        throw new Error('Todo update failed.');
      }
    },

    async setDueDate(ownerToken, id, dueDate) {
      const operationId = crypto.randomUUID();
      try {
        const result = await queryable.query<{ id: string }>(
          `update ${target.tableSql} set due_date = $3 where id = $1 and owner_token = $2 returning id`,
          [id, ownerToken, dueDate],
        );
        return result.rows.length > 0;
      } catch {
        recordOperationFailure(operationId);
        throw new Error('Todo update failed.');
      }
    },

    async remove(ownerToken, id) {
      const operationId = crypto.randomUUID();
      try {
        const result = await queryable.query<{ id: string }>(
          `delete from ${target.tableSql} where id = $1 and owner_token = $2 returning id`,
          [id, ownerToken],
        );
        return result.rows.length > 0;
      } catch {
        recordOperationFailure(operationId);
        throw new Error('Todo removal failed.');
      }
    },
  };
}

function createEnvironmentRepository(): TodoRepository {
  const target = resolveDatabaseTarget(process.env);
  return createTodoRepository(createTodoPool(target), target);
}

export async function listTodos(ownerToken: string): Promise<Todo[]> {
  return createEnvironmentRepository().list(ownerToken);
}

export async function createTodo(
  ownerToken: string,
  title: string,
  dueDate: string | null,
): Promise<Todo> {
  return createEnvironmentRepository().create(ownerToken, title, dueDate);
}

export async function setTodoDone(ownerToken: string, id: string, isDone: boolean): Promise<boolean> {
  return createEnvironmentRepository().setDone(ownerToken, id, isDone);
}

export async function setTodoDueDate(
  ownerToken: string,
  id: string,
  dueDate: string | null,
): Promise<boolean> {
  return createEnvironmentRepository().setDueDate(ownerToken, id, dueDate);
}

export async function removeTodo(ownerToken: string, id: string): Promise<boolean> {
  return createEnvironmentRepository().remove(ownerToken, id);
}
