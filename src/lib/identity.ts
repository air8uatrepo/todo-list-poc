import 'server-only';

import { cookies } from 'next/headers';

export const OWNER_COOKIE = 'todo_owner';

/**
 * Anonymous ownership.
 *
 * A visitor is initialized with an opaque owner token on first use, so there is
 * no registration step and no account to manage. The token is the only thing
 * that scopes a list to one person, so it must be unguessable and must never be
 * derived from anything personal.
 */
export function createOwnerToken(): string {
  return crypto.randomUUID();
}

export function isValidOwnerToken(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Read the current owner token, creating one when the visitor has none.
 *
 * Must be called from a Server Action or Route Handler, where cookies are
 * writable. A Server Component can read the cookie but cannot set it.
 */
export async function resolveOwnerToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(OWNER_COOKIE)?.value;

  if (isValidOwnerToken(existing)) return existing;

  const token = createOwnerToken();
  store.set(OWNER_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return token;
}

/** Read the owner token without creating one. Returns null for a new visitor. */
export async function readOwnerToken(): Promise<string | null> {
  const store = await cookies();
  const existing = store.get(OWNER_COOKIE)?.value;
  return isValidOwnerToken(existing) ? existing : null;
}
