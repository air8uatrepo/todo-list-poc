import { createHash } from 'node:crypto';
import fs from 'node:fs';
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

const manifest = JSON.parse(
  fs.readFileSync(new URL("../supabase/migrations/manifest.json", import.meta.url), "utf8"),
) as { migrations: { id: string; template: string; sha256: string }[] };

/**
 * Read a migration template as LF text.
 *
 * This checkout has core.autocrlf=true, so the working-tree bytes may be CRLF
 * while the committed blob is LF. The pin has to describe one canonical form,
 * otherwise it verifies differently on different machines.
 */
function templateText(relativePath: string): string {
  const contents = fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
  return contents.split("\r\n").join("\n");
}

function migrationEntry(id: string): { id: string; template: string; sha256: string } {
  const entry = manifest.migrations.find((migration) => migration.id === id);
  if (entry === undefined) throw new Error(`Missing migration manifest entry: ${id}`);
  return entry;
}

function dueDateTemplate(): string {
  return migrationEntry("REQ-002/002").template;
}

function protoTarget() {
  return resolveDatabaseTarget({
    BUSINESS_DIRECT_DATABASE_URL: "postgres://example",
    BUSINESS_DIRECT_DEPLOYMENT_TIER: "proto",
    BUSINESS_DIRECT_DATABASE_SCHEMA: "proto_todo_list_poc",
  });
}

describe("002 add due date migration", () => {
    it("is pinned in the manifest as a new template", () => {
    expect(dueDateTemplate()).toBe("supabase/migrations/templates/002_add_todo_due_date.sql.tmpl");
  });

  it("matches its recorded sha256 pin", () => {
    const actual = createHash("sha256")
      .update(Buffer.from(templateText(dueDateTemplate()), "utf8"))
      .digest("hex");
    expect(actual).toBe(migrationEntry("REQ-002/002").sha256);
  });

  it("leaves the already-applied REQ-001 template untouched", () => {
    const first = migrationEntry("REQ-001/001");
    expect(first.template).toBe("supabase/migrations/templates/001_create_todos.sql.tmpl");
    // An additive change must not rewrite a template that has already run.
    expect(templateText(first.template)).not.toMatch(/due_date/i);
  });

  it("adds a nullable due_date column and drops nothing", () => {
    const rendered = renderTodoMigration(protoTarget(), templateText(dueDateTemplate()));
    expect(rendered).toMatch(/add column if not exists due_date date/i);
    expect(rendered).not.toMatch(/\bdrop\s+(table|column)\b/i);
    expect(rendered).not.toMatch(/due_date[^;]*not null/i);
  });

  it("still rebuilds the whole target on its own", () => {
    const rendered = renderTodoMigration(protoTarget(), templateText(dueDateTemplate()));
    expect(rendered).toMatch(/create schema if not exists/);
    expect(rendered).toMatch(/create table if not exists/);
    expect(rendered).toMatch(/enable row level security/);
    expect(rendered).toMatch(/create policy todos_app_role/);
    expect(rendered).toMatch(/grant select, insert, update, delete/);
  });
});
