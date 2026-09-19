import { assertDatabaseTarget, type DatabaseTarget } from './target-schema';

const invalidTemplateMessage = 'Todo migration template is invalid.';

/**
 * The least-privilege role the application connects as. The role is created by
 * the privileged bootstrap asset, not by this migration.
 */
export const APP_ROLE = 'todo_list_poc_app';

export function renderTodoMigration(target: DatabaseTarget, template: string): string {
  assertDatabaseTarget(target);

  const schemaToken = '{{TARGET_SCHEMA}}';
  const roleToken = '{{APP_ROLE}}';
  if (!template.includes(schemaToken) || !template.includes(roleToken)) {
    throw new Error(invalidTemplateMessage);
  }

  const rendered = template
    .replaceAll(schemaToken, target.schemaSql)
    .replaceAll(roleToken, APP_ROLE);

  // A leftover placeholder means the target is incomplete; a reference to the
  // shared `public` schema means the migration escaped its own target.
  if (/{{[^}]+}}/.test(rendered) || /\bpublic\s*\.\s*todos\b/i.test(rendered)) {
    throw new Error(invalidTemplateMessage);
  }

  return rendered;
}
