import { describe, expect, it } from 'vitest';
import {
  formatDueDate,
  isOverdue,
  localCalendarDate,
  parseCreateTodoBody,
  parseCreateTodoInput,
  validateDueDate,
  validateTodoTitle,
  TITLE_MAX_LENGTH,
} from '@/src/lib/todos';

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

describe('due date helpers', () => {
  it('renders a stored date readably without a timezone shift', () => {
    expect(formatDueDate('2026-09-30')).toBe('30 Sep 2026');
    expect(formatDueDate('2026-01-01')).toBe('1 Jan 2026');
  });

  it('reads the local calendar day, not the UTC one', () => {
    // 00:05 and 23:55 on the same local day must agree, and the value must
    // come from local getters so a UTC server cannot shift the calendar day.
    expect(localCalendarDate(new Date(2026, 8, 20, 0, 5))).toBe('2026-09-20');
    expect(localCalendarDate(new Date(2026, 8, 20, 23, 55))).toBe('2026-09-20');
    expect(localCalendarDate(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });

  it('does not mark a task due today as overdue', () => {
    expect(isOverdue('2026-09-20', false, '2026-09-20')).toBe(false);
    expect(isOverdue('2026-09-19', false, '2026-09-20')).toBe(true);
    expect(isOverdue('2026-09-21', false, '2026-09-20')).toBe(false);
  });

  it('never marks a done task overdue', () => {
    expect(isOverdue('2026-09-19', true, '2026-09-20')).toBe(false);
    expect(isOverdue('2020-01-01', true, '2026-09-20')).toBe(false);
  });

  it('never marks a task with no date overdue', () => {
    // `''` sorts before every real date, so a bare comparison would call a
    // task with no due date overdue.
    expect(isOverdue('', false, '2026-09-20')).toBe(false);
    expect(isOverdue('', false, '0000-01-01')).toBe(false);
  });
});

describe('validateDueDate', () => {
  it('treats an empty choice as no due date', () => {
    expect(validateDueDate('')).toEqual({ ok: true, value: { dueDate: null } });
    expect(validateDueDate(undefined)).toEqual({ ok: true, value: { dueDate: null } });
    expect(validateDueDate(null)).toEqual({ ok: true, value: { dueDate: null } });
  });

  it('accepts a real date, including a past one', () => {
    expect(validateDueDate('2026-09-30')).toEqual({ ok: true, value: { dueDate: '2026-09-30' } });
    expect(validateDueDate('2026-09-18')).toEqual({ ok: true, value: { dueDate: '2026-09-18' } });
  });

  it('refuses a malformed or impossible date', () => {
    expect(validateDueDate('30/09/2026').ok).toBe(false);
    expect(validateDueDate('2026-02-30').ok).toBe(false);
    expect(validateDueDate('2026-13-01').ok).toBe(false);
    expect(validateDueDate(20260930).ok).toBe(false);
  });
});

describe("parseCreateTodoInput", () => {
  it("reads a title with no due date", () => {
    expect(parseCreateTodoInput({ title: "walk dog" })).toEqual({
      ok: true,
      value: { title: "walk dog", dueDate: null },
    });
  });

  it("treats an empty due date as no due date", () => {
    expect(parseCreateTodoInput({ title: "walk dog", dueDate: "" })).toEqual({
      ok: true,
      value: { title: "walk dog", dueDate: null },
    });
  });

  it("reads a chosen due date, including a past one", () => {
    expect(parseCreateTodoInput({ title: "walk dog", dueDate: "2026-09-30" })).toEqual({
      ok: true,
      value: { title: "walk dog", dueDate: "2026-09-30" },
    });
    expect(parseCreateTodoInput({ title: "walk dog", dueDate: "2026-09-18" })).toEqual({
      ok: true,
      value: { title: "walk dog", dueDate: "2026-09-18" },
    });
  });

  it("refuses an impossible due date", () => {
    expect(parseCreateTodoInput({ title: "walk dog", dueDate: "2026-02-30" }).ok).toBe(false);
    expect(parseCreateTodoInput({ title: "walk dog", dueDate: "30/09/2026" }).ok).toBe(false);
  });

  it("still refuses a missing title", () => {
    expect(parseCreateTodoInput({ dueDate: "2026-09-30" }).ok).toBe(false);
    expect(parseCreateTodoInput(null).ok).toBe(false);
  });
});
