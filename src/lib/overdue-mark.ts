/**
 * The overdue rule and the client-side marking that applies it.
 *
 * "Overdue" depends on the visitor's own calendar day, and only the browser
 * knows it: the deployment runs in UTC, so a server-side decision would mark a
 * task overdue before the visitor's own day has started, or miss one whose day
 * has. The server therefore renders the date plus a hidden mark, and this small
 * script reveals the mark while the HTML is still being parsed, so there is no
 * hydration mismatch and no visible flash.
 *
 * The rule must also re-apply after the list updates in place. A server action
 * calls `revalidatePath('/')` and React re-renders the list without a document
 * load, so a row created or changed after the first paint never passes through
 * the parse-time pass and would keep a hidden mark until the next reload. A
 * MutationObserver therefore re-runs the same pass on in-page updates.
 *
 * THIS MODULE MUST NOT IMPORT ANYTHING.
 *
 * The rule below is serialized into the inline script with `String(fn)`, and a
 * bundler rewrites an *imported* binding inside a serialized function body into
 * a module-loader reference (Vite emits `__vite_ssr_import_0__.isOverdue`),
 * which does not exist in the browser. Keeping the rule in an import-free
 * module is what makes the serialized source runnable in the browser while
 * still being exactly the code the unit tests exercise, so the two cannot
 * drift apart. `tests/due-date.test.tsx` asserts the emitted script carries no
 * module-loader reference, which fails if an import is ever reintroduced.
 */

export const OVERDUE_TESTID = 'todo-overdue';

/** Marks a row that has a due date, so the script can find it. */
export const DUE_DATE_ATTRIBUTE = 'data-due-date';

/**
 * The calendar day the given instant falls on for the runtime timezone.
 *
 * Built from local getters, so in the browser it is the visitor's own calendar
 * day. `toISOString()` would convert to UTC and report the wrong day for any
 * timezone whose local day differs from the UTC one.
 *
 * Deliberately self-contained: it references no other identifier, so it can be
 * embedded verbatim into the inline browser script that decides overdue.
 */
export function localCalendarDate(now: Date): string {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return `${now.getFullYear()}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
}

/**
 * An open task whose due date is earlier than today is overdue. A task due
 * today is not overdue, and a done task is never overdue.
 *
 * An empty date means the task has no due date, so it is never overdue: the
 * comparison would otherwise treat `''` as earlier than every real date and
 * mark a task that carries no date at all.
 */
export function isOverdue(dueDate: string, isDone: boolean, today: string): boolean {
  if (dueDate === '') return false;
  return !isDone && dueDate < today;
}

/**
 * Reveal the mark on any row the shared rule reports as overdue.
 *
 * Every value it needs arrives as a parameter, so the function body has NO
 * free identifier. That is what makes it safe to serialize: a minifier renames
 * a serialized body's references to module-scope bindings but leaves the
 * hand-written declarations in the emitted script alone, so a body that closed
 * over module bindings would reference names that do not exist in the script
 * scope and throw at runtime in a production build only.
 *
 * Written against the small DOM surface it actually needs, so it runs unchanged
 * in the browser and against the test stub. A done task carries no mark at all,
 * so `isDone` is false here by construction; the rule still owns the ordering
 * comparison.
 */
function revealOverdueMarks(
  root: ParentNode,
  today: Date,
  dueDateAttribute: string,
  overdueTestId: string,
  isOverdueFn: (dueDate: string, isDone: boolean, today: string) => boolean,
  localCalendarDateFn: (now: Date) => string,
): void {
  const todayText = localCalendarDateFn(today);
  const rows = root.querySelectorAll(`[${dueDateAttribute}]`);
  for (const row of Array.from(rows)) {
    const dueDate = row.getAttribute(dueDateAttribute);
    if (dueDate === null) continue;
    const mark = row.querySelector(`[data-testid="${overdueTestId}"]`) as { hidden: boolean } | null;
    // The rule is authoritative in both directions after an in-page update.
    // Revealing only would leave a stale mark on a row whose date an in-page
    // update moved beyond today: React re-renders the same mark node with an
    // unchanged `hidden` prop, so it never resets the value this script set.
    if (mark !== null) mark.hidden = !isOverdueFn(dueDate, false, todayText);
  }
}

/**
 * Serialize the shared rule plus the DOM wiring into one inline script.
 *
 * `String(fn)` is used deliberately: it keeps a single source of truth for the
 * rule. This module stays on the server (it is imported by the page, not by a
 * client component), so the emitted source is the same in development and in a
 * production build. The emitted names are this module's own top-level bindings,
 * which a bundler leaves alone; see the module comment above.
 */
export function buildOverdueScript(): string {
  return [
    '(function(){',
    `var DUE_DATE_ATTRIBUTE=${JSON.stringify(DUE_DATE_ATTRIBUTE)};`,
    `var OVERDUE_TESTID=${JSON.stringify(OVERDUE_TESTID)};`,
    `var localCalendarDate=${String(localCalendarDate)};`,
    `var isOverdue=${String(isOverdue)};`,
    `var revealOverdueMarks=${String(revealOverdueMarks)};`,
    'revealOverdueMarks(document, new Date(), DUE_DATE_ATTRIBUTE, OVERDUE_TESTID, isOverdue, localCalendarDate);',
    // Re-apply after an in-page list update, which a server action produces by
    // calling revalidatePath('/'). Written out in full rather than naming a
    // helper, so no new identifier is introduced and every serialized body
    // keeps taking its values as parameters. Guarded, so the script still runs
    // where the API is absent, and idempotent: revealing an already-visible
    // mark records no further mutation, so the observer cannot re-trigger
    // itself.
    'if(typeof MutationObserver!=="undefined"){new MutationObserver(function(){revealOverdueMarks(document, new Date(), DUE_DATE_ATTRIBUTE, OVERDUE_TESTID, isOverdue, localCalendarDate);}).observe(document.documentElement,{childList:true,subtree:true});}',
    '})();',
  ].join('');
}
