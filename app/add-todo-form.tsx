'use client';

import { useActionState } from 'react';
import { addTodoAction, type TodoActionState } from './actions';

const initialState: TodoActionState = { error: null };

export function AddTodoForm() {
  const [state, formAction, pending] = useActionState(addTodoAction, initialState);

  return (
    <form action={formAction} className="add-form">
      <label htmlFor="title" className="sr-only">
        New task
      </label>
      <input
        id="title"
        name="title"
        type="text"
        placeholder="What needs doing?"
        autoComplete="off"
        maxLength={200}
        required
      />
      <label htmlFor="dueDate" className="sr-only">
        Due date (optional)
      </label>
      <input
        id="dueDate"
        name="dueDate"
        type="date"
        className="due-input"
        aria-label="Due date (optional)"
      />
      <button type="submit" disabled={pending}>
        {pending ? 'Adding...' : 'Add task'}
      </button>
      {state.error ? (
        <p role="alert" className="error">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
