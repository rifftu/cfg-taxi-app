import corpus from "@/app/lib/__fixtures__/grammar-corpus.json";
import { createClickHouseExecutor } from "@/app/lib/clickhouseClient";
import { validateSql } from "@/app/lib/sqlSafety";
import { getSqlTableIdentifier, withSqlTableIdentifier } from "@/app/lib/tableConfig";
import { hasEnvValues, loadLocalEnv } from "@/scripts/load-local-env";

async function main() {
  loadLocalEnv();

  if (
    !hasEnvValues([
      "CLICKHOUSE_HOST",
      "CLICKHOUSE_USERNAME",
      "CLICKHOUSE_PASSWORD",
    ])
  ) {
    console.log("Skipping ClickHouse corpus execution because credentials are not set.");
    return;
  }

  const executor = createClickHouseExecutor();
  const tableIdentifier = getSqlTableIdentifier();
  const positiveCases = corpus.filter((testCase) => testCase.should_parse);

  for (const testCase of positiveCases) {
    const sql = withSqlTableIdentifier(testCase.input, tableIdentifier);
    const validationResult = validateSql(sql);

    if (!validationResult.valid) {
      throw new Error(`${testCase.name}: validator rejected SQL: ${validationResult.reason}`);
    }

    const rows = await executor.execute(validationResult.normalizedSql);

    if (rows.length === 0) {
      throw new Error(`${testCase.name}: ClickHouse returned no rows.`);
    }

    console.log(`PASS ${testCase.name}: ${rows.length} row(s)`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
