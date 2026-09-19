import { describe, expect, it } from 'vitest';
import { parseCreateTodoBody, validateTodoTitle, TITLE_MAX_LENGTH } from '@/src/lib/todos';

describe('validateTodoTitle', () => {
  it('accepts a normal title and trims it', () => {
    expect(validateTodoTitle('  buy milk  ')).toEqual({ ok: true, value: { title: 'buy milk' } });
  });

  it('rejects a non-string', () => {
    expect(validateTodoTitle(undefined).ok).toBe(false);
    expect(validateTodoTitle(42).ok).toBe(false);
  });

  it('rejects an empty or whitespace-only title', () => {
    expect(validateTodoTitle('').ok).toBe(false);
    expect(validateTodoTitle('   ').ok).toBe(false);
  });

  it('rejects a title longer than the limit', () => {
    expect(validateTodoTitle('x'.repeat(TITLE_MAX_LENGTH)).ok).toBe(true);
    expect(validateTodoTitle('x'.repeat(TITLE_MAX_LENGTH + 1)).ok).toBe(false);
  });
});

describe('parseCreateTodoBody', () => {
  it('reads the title field', () => {
    expect(parseCreateTodoBody({ title: 'walk dog' })).toEqual({
      ok: true,
      value: { title: 'walk dog' },
    });
  });

  it('rejects a body that is not an object', () => {
    expect(parseCreateTodoBody(null).ok).toBe(false);
    expect(parseCreateTodoBody('title').ok).toBe(false);
  });

  it('rejects an object without a usable title', () => {
    expect(parseCreateTodoBody({}).ok).toBe(false);
    expect(parseCreateTodoBody({ title: 5 }).ok).toBe(false);
  });
});
