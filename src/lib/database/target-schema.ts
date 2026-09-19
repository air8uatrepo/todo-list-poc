export type DatabaseTier = 'proto' | 'preview' | 'production';

export type DatabaseTarget = {
  tier: DatabaseTier;
  schema: string;
  schemaSql: string;
  tableSql: string;
};

const PROTO_SCHEMA = 'proto_todo_list_poc';
const PRODUCTION_SCHEMA = 'app_todo_list_poc';
const TABLE = 'todos';

const invalidTargetMessage = 'Database target configuration is invalid.';

function invalidTarget(): never {
  throw new Error(invalidTargetMessage);
}

function targetFor(tier: DatabaseTier, schema: string): DatabaseTarget {
  const schemaSql = `"${schema}"`;
  return { tier, schema, schemaSql, tableSql: `${schemaSql}."${TABLE}"` };
}

/**
 * Resolve the database target from the environment.
 *
 * Production and the test tier must resolve to different schemas. A shared
 * variable scoped to `preview,production` together carries one value for both,
 * which would write production traffic into the test schema; that is rejected
 * here rather than discovered later.
 */
export function resolveDatabaseTarget(
  env: Readonly<Record<string, string | undefined>>,
): DatabaseTarget {
  const databaseUrl = env.BUSINESS_DIRECT_DATABASE_URL;
  const tier = env.BUSINESS_DIRECT_DEPLOYMENT_TIER;
  const schema = env.BUSINESS_DIRECT_DATABASE_SCHEMA;

  if (databaseUrl === undefined || databaseUrl === '') return invalidTarget();
  if (schema === undefined || schema === '') return invalidTarget();

  if ((tier === 'proto' || tier === 'preview') && schema === PROTO_SCHEMA) {
    return targetFor(tier, schema);
  }
  if (tier === 'production' && schema === PRODUCTION_SCHEMA) {
    return targetFor(tier, schema);
  }
  return invalidTarget();
}

export function assertDatabaseTarget(target: unknown): asserts target is DatabaseTarget {
  if (typeof target !== 'object' || target === null) invalidTarget();

  const candidate = target as Partial<DatabaseTarget>;

  if (
    typeof candidate.tier !== 'string'
    || typeof candidate.schema !== 'string'
    || typeof candidate.schemaSql !== 'string'
    || typeof candidate.tableSql !== 'string'
  ) {
    invalidTarget();
  }

  const valid =
    ((candidate.tier === 'proto' || candidate.tier === 'preview')
      && candidate.schema === PROTO_SCHEMA)
    || (candidate.tier === 'production' && candidate.schema === PRODUCTION_SCHEMA);
  if (!valid) invalidTarget();

  if (candidate.tableSql !== `${candidate.schemaSql}."${TABLE}"`) invalidTarget();
}
