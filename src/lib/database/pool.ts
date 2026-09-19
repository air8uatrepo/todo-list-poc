import 'server-only';

import { Pool } from 'pg';
import { assertDatabaseTarget, type DatabaseTarget } from './target-schema';
import { SUPABASE_CA_PEM } from './supabase-ca';

export type QueryResult<Row> = { rows: Row[] };

export interface Queryable {
  query<Row>(text: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
}

export function createTodoPool(target: DatabaseTarget): Queryable {
  assertDatabaseTarget(target);

  const connectionString = process.env.BUSINESS_DIRECT_DATABASE_URL;
  if (connectionString === undefined || connectionString === '') {
    throw new Error('Database target configuration is invalid.');
  }

  // Supabase serves its pooler under the Supabase CA chain. Node does not ship
  // that root, so a verifying client fails with SELF_SIGNED_CERT_IN_CHAIN
  // before authentication is attempted. Ship the CA and keep verification on.
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: true, ca: SUPABASE_CA_PEM },
  });
}
