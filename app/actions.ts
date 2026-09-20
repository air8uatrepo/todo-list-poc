'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { resolveOwnerToken } from '@/src/lib/identity';
import { createTodo, removeTodo, setTodoDone, setTodoDueDate } from '@/src/lib/todos-repository';
import { parseCreateTodoInput, validateDueDate } from '@/src/lib/todos';

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
  const parsed = parseCreateTodoInput({
    title: formData.get('title'),
    dueDate: formData.get('dueDate'),
  });
  if (!parsed.ok) {
    return { error: parsed.fieldErrors.title || 'Check the task and its due date.' };
  }

  try {
    const ownerToken = await resolveOwnerToken();
    await createTodo(ownerToken, parsed.value.title, parsed.value.dueDate);
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

/**
 * Set, change, or clear a task due date from its own row.
 *
 * An empty field clears the date, which is what keeps the date optional for the
 * whole life of the task. A malformed date is ignored rather than stored.
 */
export async function setDueDateAction(formData: FormData): Promise<void> {
  const id = formData.get('id');
  const raw = formData.get('dueDate');
  if (typeof id !== 'string') return;

  const parsed = validateDueDate(raw);
  if (!parsed.ok) return;

  const ownerToken = await resolveOwnerToken();
  await setTodoDueDate(ownerToken, id, parsed.value.dueDate);
  revalidatePath('/');
}

export async function removeTodoAction(formData: FormData): Promise<void> {
  const id = formData.get('id');
  if (typeof id !== 'string') return;

  const ownerToken = await resolveOwnerToken();
  await removeTodo(ownerToken, id);
  revalidatePath('/');
}
