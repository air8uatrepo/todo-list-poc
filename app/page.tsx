import { AddTodoForm } from './add-todo-form';
import { DueDate } from './due-date';
import { removeTodoAction, setDueDateAction, toggleTodoAction } from './actions';
import { readOwnerToken } from '@/src/lib/identity';
import { listTodos } from '@/src/lib/todos-repository';
import { buildOverdueScript } from '@/src/lib/overdue-mark';
import type { Todo } from '@/src/lib/todos';

export const dynamic = 'force-dynamic';

function TodoRow({ todo }: { todo: Todo }) {
  const next = todo.isDone ? 'false' : 'true';
  return (
    <li className={todo.isDone ? 'todo done' : 'todo'} data-testid="todo-row">
      <form action={toggleTodoAction}>
        <input type="hidden" name="id" value={todo.id} />
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="toggle"
          aria-pressed={todo.isDone}
          aria-label={todo.isDone ? `Mark ${todo.title} as not done` : `Mark ${todo.title} as done`}
        >
          {todo.isDone ? 'Done' : 'Open'}
        </button>
      </form>
      <span className="title" data-testid="todo-title">{todo.title}</span>
      <DueDate dueDate={todo.dueDate} isDone={todo.isDone} />
      <form action={setDueDateAction} className="due-form">
        <input type="hidden" name="id" value={todo.id} />
        <label htmlFor={`due-${todo.id}`} className="sr-only">
          Due date for {todo.title}
        </label>
        <input
          id={`due-${todo.id}`}
          name="dueDate"
          type="date"
          className="due-input"
          defaultValue={todo.dueDate ?? ''}
        />
        <button type="submit" className="save-due" aria-label={`Save due date for ${todo.title}`}>
          Save
        </button>
      </form>
      <form action={removeTodoAction}>
        <input type="hidden" name="id" value={todo.id} />
        <button type="submit" className="remove" aria-label={`Delete ${todo.title}`}>
          Delete
        </button>
      </form>
    </li>
  );
}

export default async function HomePage() {
  const ownerToken = await readOwnerToken();
  const todos = ownerToken === null ? [] : await listTodos(ownerToken);
  const openCount = todos.filter((todo) => !todo.isDone).length;

  return (
    <main>
      <header>
        <h1>My Todos</h1>
        <p className="subtitle">
          Your list is private to this browser. No sign-up needed.
        </p>
      </header>

      <AddTodoForm />

      <p className="summary" data-testid="todo-summary">
        {todos.length === 0
          ? 'Nothing here yet.'
          : `${openCount} open of ${todos.length} total.`}
      </p>

      <ul className="todo-list">
        {todos.map((todo) => (
          <TodoRow key={todo.id} todo={todo} />
        ))}
      </ul>

      {/*
        The overdue mark depends on the visitor's own calendar day, which the
        server cannot know. This runs synchronously while the HTML is parsed, so
        the mark is revealed before the first paint: no flash and no hydration
        mismatch.
      */}
      <script dangerouslySetInnerHTML={{ __html: buildOverdueScript() }} />
    </main>
  );
}
