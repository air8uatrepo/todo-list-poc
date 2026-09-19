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
};

// The `pg` driver materializes `timestamptz` as a `Date`, while the UI needs a
// stable text form. Normalizing here keeps a raw `Date` from reaching React,
// which cannot render it as a child and fails at render time rather than at
// query time.
function toCreatedAtText(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toTodo(row: DatabaseTodo): Todo {
  return {
    id: row.id,
    title: row.title,
    isDone: row.is_done,
    createdAt: toCreatedAtText(row.created_at),
  };
}

function recordOperationFailure(operationId: string): void {
  console.error({ operationId });
}

export type TodoRepository = {
  list(ownerToken: string): Promise<Todo[]>;
  create(ownerToken: string, title: string): Promise<Todo>;
  setDone(ownerToken: string, id: string, isDone: boolean): Promise<boolean>;
  remove(ownerToken: string, id: string): Promise<boolean>;
};

export function createTodoRepository(queryable: Queryable, target: DatabaseTarget): TodoRepository {
  assertDatabaseTarget(target);

  return {
    async list(ownerToken) {
      const operationId = crypto.randomUUID();
      try {
        const result = await queryable.query<DatabaseTodo>(
          `select id, title, is_done, created_at from ${target.tableSql} where owner_token = $1 order by created_at desc`,
          [ownerToken],
        );
        return result.rows.map(toTodo);
      } catch {
        recordOperationFailure(operationId);
        throw new Error('Todo retrieval failed.');
      }
    },

    async create(ownerToken, title) {
      const operationId = crypto.randomUUID();
      try {
        const result = await queryable.query<DatabaseTodo>(
          `insert into ${target.tableSql} (owner_token, title) values ($1, $2) returning id, title, is_done, created_at`,
          [ownerToken, title],
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

export async function createTodo(ownerToken: string, title: string): Promise<Todo> {
  return createEnvironmentRepository().create(ownerToken, title);
}

export async function setTodoDone(ownerToken: string, id: string, isDone: boolean): Promise<boolean> {
  return createEnvironmentRepository().setDone(ownerToken, id, isDone);
}

export async function removeTodo(ownerToken: string, id: string): Promise<boolean> {
  return createEnvironmentRepository().remove(ownerToken, id);
}
