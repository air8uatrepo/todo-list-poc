import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { DueDate } from '@/app/due-date';
import { buildOverdueScript, DUE_DATE_ATTRIBUTE, OVERDUE_TESTID } from '@/src/lib/overdue-mark';

describe('DueDate on the server', () => {
  it('shows the readable date for a task that has one', () => {
    const html = renderToStaticMarkup(<DueDate dueDate="2026-09-30" isDone={false} />);

    expect(html).toContain('30 Sep 2026');
    expect(html).toContain('data-testid="todo-due-date"');
  });

  it('renders nothing for a task with no due date', () => {
    expect(renderToStaticMarkup(<DueDate dueDate={null} isDone={false} />)).toBe('');
  });

  it('carries a hidden overdue mark for an open dated task', () => {
    const html = renderToStaticMarkup(<DueDate dueDate="2026-09-18" isDone={false} />);

    // The mark is in the markup but starts hidden: the server cannot know the
    // visitor local calendar day, so it must not decide overdue itself.
    expect(html).toContain(`data-testid="${OVERDUE_TESTID}"`);
    expect(html).toContain(`${DUE_DATE_ATTRIBUTE}="2026-09-18"`);
    expect(html).toMatch(/hidden/);
  });

  it('does not render an overdue mark at all for a done task', () => {
    const html = renderToStaticMarkup(<DueDate dueDate="2026-09-18" isDone={true} />);

    expect(html).toContain('18 Sep 2026');
    expect(html).not.toContain(OVERDUE_TESTID);
  });
});

type StubRow = {
  due: string;
  mark: { hidden: boolean } | null;
};

/**
 * Run the inline script against a minimal DOM stub.
 *
 * The script only uses `querySelectorAll`, `getAttribute`, `querySelector` and
 * `hidden`, so a small stub is enough to observe which rows it actually
 * reveals. Asserting on real behavior is stronger than matching script text,
 * which would pass even if the comparison were wrong.
 */
function runScript(rows: StubRow[]): void {
  const elements = rows.map((row) => ({
    getAttribute: (name: string) => (name === DUE_DATE_ATTRIBUTE ? row.due : null),
    querySelector: () => row.mark,
  }));
  const documentStub = {
    querySelectorAll: (selector: string) =>
      selector === `[${DUE_DATE_ATTRIBUTE}]` ? elements : [],
  };
  const run = new Function('document', buildOverdueScript()) as (doc: unknown) => void;
  run(documentStub);
}

function localDay(offsetDays: number): string {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return `${now.getFullYear()}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
}

describe('the inline overdue script', () => {
  it('emits a script the browser can actually run', () => {
    const script = buildOverdueScript();

    // A bundler rewrites an *imported* binding inside a serialized function
    // body into a module-loader reference such as `__vite_ssr_import_0__`,
    // which does not exist in the browser: the page would load and the mark
    // would silently never appear. Keeping the rule in an import-free module
    // is what prevents that, and this assertion fails if an import returns.
    expect(script).not.toMatch(/__vite|__webpack|_interopRequire/);
  });

  it('serializes the DOM wiring with no free module identifier', () => {
    const script = buildOverdueScript();
    const body = script.slice(script.indexOf('revealOverdueMarks=function'));
    const wiring = body.slice(0, body.indexOf('revealOverdueMarks(document'));

    // The production build MINIFIES this module, and a minifier renames a
    // serialized body's references to module-scope bindings while leaving the
    // emitted `var` declarations in their long form. A body that closed over
    // `isOverdue`/`localCalendarDate`/`DUE_DATE_ATTRIBUTE`/`OVERDUE_TESTID`
    // therefore shipped as `e(...)`/`d(...)`/`c`/`b` and threw
    // "c is not defined" in the browser only, with a green unit suite, green
    // typecheck, green lint and a green build. This asserts the wiring takes
    // every value as a parameter instead, which minification cannot break.
    // Word boundaries, so the parameter names that carry the same stem
    // (`localCalendarDateFn`, `isOverdueFn`) are not mistaken for a reference.
    for (const name of ['localCalendarDate', 'isOverdue', 'DUE_DATE_ATTRIBUTE', 'OVERDUE_TESTID']) {
      expect(wiring).not.toMatch(new RegExp(`\\b${name}\\b`));
    }
  });

  it('reveals the mark only for a date earlier than the visitor local day', () => {
    const yesterday = { due: localDay(-1), mark: { hidden: true } };
    const today = { due: localDay(0), mark: { hidden: true } };
    const tomorrow = { due: localDay(1), mark: { hidden: true } };

    runScript([yesterday, today, tomorrow]);

    expect(yesterday.mark.hidden).toBe(false);
    // A task due today is NOT overdue.
    expect(today.mark.hidden).toBe(true);
    expect(tomorrow.mark.hidden).toBe(true);
  });

  it('leaves an undated row alone', () => {
    const undated = { due: '', mark: { hidden: true } };
    runScript([undated]);
    expect(undated.mark.hidden).toBe(true);
  });

  it('decides from the visitor local day, not the UTC day', () => {
    const original = process.env.TZ;
    // A zone ahead of UTC: local midnight is the previous day in UTC, so a
    // UTC-based today would leave today's task looking overdue.
    process.env.TZ = 'Asia/Shanghai';
    try {
      const today = { due: localDay(0), mark: { hidden: true } };
      runScript([today]);
      expect(today.mark.hidden).toBe(true);
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});
