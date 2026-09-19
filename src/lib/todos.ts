export type Todo = {
  id: string;
  title: string;
  isDone: boolean;
  createdAt: string;
};

export type TodoValidation =
  | { ok: true; value: { title: string } }
  | { ok: false; fieldErrors: { title: string } };

export const TITLE_MAX_LENGTH = 200;

export function validateTodoTitle(raw: unknown): TodoValidation {
  if (typeof raw !== 'string') {
    return { ok: false, fieldErrors: { title: 'Enter a task.' } };
  }
  const title = raw.trim();
  if (title === '') {
    return { ok: false, fieldErrors: { title: 'Enter a task.' } };
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return { ok: false, fieldErrors: { title: `Use ${TITLE_MAX_LENGTH} characters or fewer.` } };
  }
  return { ok: true, value: { title } };
}

export function parseCreateTodoBody(body: unknown): TodoValidation {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, fieldErrors: { title: 'Enter a task.' } };
  }
  return validateTodoTitle((body as { title?: unknown }).title);
}
