'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { resolveOwnerToken } from '@/src/lib/identity';
import { createTodo, removeTodo, setTodoDone } from '@/src/lib/todos-repository';
import { parseCreateTodoBody } from '@/src/lib/todos';

export type TodoActionState = { error: string | null };

/**
 * Add a task.
 *
 * A brand-new visitor has no owner cookie yet, so this action is the request
 * that creates it. It redirects rather than revalidating: the redirect makes
 * the browser issue a fresh request that carries the new cookie, so the task
 * the visitor just added is guaranteed to be visible immediately instead of
 * depending on whether the same render pass can observe a cookie it just set.
 */
export async function addTodoAction(
  _previous: TodoActionState,
  formData: FormData,
): Promise<TodoActionState> {
  const parsed = parseCreateTodoBody({ title: formData.get('title') });
  if (!parsed.ok) {
    return { error: parsed.fieldErrors.title };
  }

  try {
    const ownerToken = await resolveOwnerToken();
    await createTodo(ownerToken, parsed.value.title);
  } catch {
    return { error: 'Unable to save this task. Try again.' };
  }

  revalidatePath('/');
  redirect('/');
}

export async function toggleTodoAction(formData: FormData): Promise<void> {
  const id = formData.get('id');
  const next = formData.get('next');
  if (typeof id !== 'string' || (next !== 'true' && next !== 'false')) return;

  const ownerToken = await resolveOwnerToken();
  await setTodoDone(ownerToken, id, next === 'true');
  revalidatePath('/');
}

export async function removeTodoAction(formData: FormData): Promise<void> {
  const id = formData.get('id');
  if (typeof id !== 'string') return;

  const ownerToken = await resolveOwnerToken();
  await removeTodo(ownerToken, id);
  revalidatePath('/');
}
