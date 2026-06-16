export const defaultSqlTableIdentifier = "nyc_taxi.trips_small";

type SqlTableEnv = {
  CLICKHOUSE_DATABASE?: string;
  CLICKHOUSE_TABLE?: string;
};

export function getSqlTableIdentifier(
  env: SqlTableEnv = {
    CLICKHOUSE_DATABASE: process.env.CLICKHOUSE_DATABASE,
    CLICKHOUSE_TABLE: process.env.CLICKHOUSE_TABLE,
  },
) {
  const database = env.CLICKHOUSE_DATABASE?.trim();
  const table = env.CLICKHOUSE_TABLE?.trim();

  if (!database || !table) {
    return defaultSqlTableIdentifier;
  }

  return `${database}.${table}`;
}

export function withSqlTableIdentifier(sql: string, tableIdentifier: string) {
  return sql.replaceAll(defaultSqlTableIdentifier, tableIdentifier);
}
