import { readOwnerToken } from '@/src/lib/identity';
import { createTodo, listTodos } from '@/src/lib/todos-repository';
import { parseCreateTodoBody } from '@/src/lib/todos';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const ownerToken = await readOwnerToken();
  if (ownerToken === null) {
    return Response.json({ ok: true, todos: [] });
  }

  try {
    return Response.json({ ok: true, todos: await listTodos(ownerToken) });
  } catch {
    return Response.json({ ok: false, error: 'Unable to load tasks.' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = parseCreateTodoBody(body);
  if (!parsed.ok) {
    return Response.json({ ok: false, fieldErrors: parsed.fieldErrors }, { status: 400 });
  }

  const ownerToken = await readOwnerToken();
  if (ownerToken === null) {
    return Response.json(
      { ok: false, error: 'Open the app first to initialize your list.' },
      { status: 409 },
    );
  }

  try {
    const todo = await createTodo(ownerToken, parsed.value.title);
    return Response.json({ ok: true, todo }, { status: 201 });
  } catch {
    return Response.json({ ok: false, error: 'Unable to save this task.' }, { status: 500 });
  }
}
