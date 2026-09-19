import { describe, expect, it } from 'vitest';
import { APP_ROLE, renderTodoMigration } from '@/src/lib/database/migration-template';
import { resolveDatabaseTarget } from '@/src/lib/database/target-schema';

const template = `create schema if not exists {{TARGET_SCHEMA}};
grant usage on schema {{TARGET_SCHEMA}} to {{APP_ROLE}};
create policy todos_app_role on {{TARGET_SCHEMA}}.todos for all to {{APP_ROLE}} using (true) with check (true);`;

describe('resolveDatabaseTarget', () => {
  it('resolves the proto tier to the proto schema', () => {
    const target = resolveDatabaseTarget({
      BUSINESS_DIRECT_DATABASE_URL: 'postgres://example',
      BUSINESS_DIRECT_DEPLOYMENT_TIER: 'proto',
      BUSINESS_DIRECT_DATABASE_SCHEMA: 'proto_todo_list_poc',
    });
    expect(target.tier).toBe('proto');
    expect(target.tableSql).toBe('"proto_todo_list_poc"."todos"');
  });

  it('resolves the production tier to the production schema', () => {
    const target = resolveDatabaseTarget({
      BUSINESS_DIRECT_DATABASE_URL: 'postgres://example',
      BUSINESS_DIRECT_DEPLOYMENT_TIER: 'production',
      BUSINESS_DIRECT_DATABASE_SCHEMA: 'app_todo_list_poc',
    });
    expect(target.tier).toBe('production');
  });

  // Production sharing the test schema would write production traffic into the
  // test database, which is exactly what a `preview,production` shared variable
  // produces. It must be rejected rather than silently accepted.
  it('rejects production pointed at the test schema', () => {
    expect(() => resolveDatabaseTarget({
      BUSINESS_DIRECT_DATABASE_URL: 'postgres://example',
      BUSINESS_DIRECT_DEPLOYMENT_TIER: 'production',
      BUSINESS_DIRECT_DATABASE_SCHEMA: 'proto_todo_list_poc',
    })).toThrow();
  });

  it('rejects a preview tier pointed at the production schema', () => {
    expect(() => resolveDatabaseTarget({
      BUSINESS_DIRECT_DATABASE_URL: 'postgres://example',
      BUSINESS_DIRECT_DEPLOYMENT_TIER: 'preview',
      BUSINESS_DIRECT_DATABASE_SCHEMA: 'app_todo_list_poc',
    })).toThrow();
  });

  it('rejects a missing connection string', () => {
    expect(() => resolveDatabaseTarget({
      BUSINESS_DIRECT_DEPLOYMENT_TIER: 'proto',
      BUSINESS_DIRECT_DATABASE_SCHEMA: 'proto_todo_list_poc',
    })).toThrow();
  });
});

describe('renderTodoMigration', () => {
  it('substitutes the target schema and the application role', () => {
    const target = resolveDatabaseTarget({
      BUSINESS_DIRECT_DATABASE_URL: 'postgres://example',
      BUSINESS_DIRECT_DEPLOYMENT_TIER: 'proto',
      BUSINESS_DIRECT_DATABASE_SCHEMA: 'proto_todo_list_poc',
    });
    const rendered = renderTodoMigration(target, template);

    expect(rendered).toContain('"proto_todo_list_poc"');
    expect(rendered).toContain(APP_ROLE);
    expect(rendered).not.toMatch(/{{[^}]+}}/);
  });

  it('rejects a template that omits a required token', () => {
    const target = resolveDatabaseTarget({
      BUSINESS_DIRECT_DATABASE_URL: 'postgres://example',
      BUSINESS_DIRECT_DEPLOYMENT_TIER: 'proto',
      BUSINESS_DIRECT_DATABASE_SCHEMA: 'proto_todo_list_poc',
    });
    expect(() => renderTodoMigration(target, 'create table todos (id uuid);')).toThrow();
  });

  it('rejects a template that escapes into the shared public schema', () => {
    const target = resolveDatabaseTarget({
      BUSINESS_DIRECT_DATABASE_URL: 'postgres://example',
      BUSINESS_DIRECT_DEPLOYMENT_TIER: 'proto',
      BUSINESS_DIRECT_DATABASE_SCHEMA: 'proto_todo_list_poc',
    });
    expect(() => renderTodoMigration(
      target,
      'create table public.todos (id uuid); {{TARGET_SCHEMA}} {{APP_ROLE}}',
    )).toThrow();
  });
});
