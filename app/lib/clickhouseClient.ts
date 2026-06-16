import { createClient } from "@clickhouse/client";
import type { QueryRow } from "@/app/lib/queryTypes";

export type QueryExecutor = {
  execute(sql: string): Promise<QueryRow[]>;
};

/** Creates the ClickHouse query executor used after SQL validation succeeds. */
export function createClickHouseExecutor(): QueryExecutor {
  const host = process.env.CLICKHOUSE_HOST;
  const username = process.env.CLICKHOUSE_USERNAME;
  const password = process.env.CLICKHOUSE_PASSWORD;
  const database = process.env.CLICKHOUSE_DATABASE ?? "nyc_taxi";

  return {
    async execute(sql: string) {
      if (!host || !username || !password) {
        throw new Error("ClickHouse credentials are not configured.");
      }

      const client = createClient({
        url: host,
        username,
        password,
        database,
      });
      const result = await client.query({
        query: sql,
        format: "JSONEachRow",
      });

      return (await result.json()) as QueryRow[];
    },
  };
}
