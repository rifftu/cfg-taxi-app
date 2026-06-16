import { evalCases } from "./cases";
import { createClickHouseExecutor } from "@/app/lib/clickhouseClient";
import { createOpenAISqlGenerator, getOpenAIModel } from "@/app/lib/openaiClient";
import { validateSql } from "@/app/lib/sqlSafety";
import { hasEnvValues, loadLocalEnv } from "@/scripts/load-local-env";

export function validateEvalDefinitions() {
  const generationCases = evalCases.filter((testCase) => testCase.shouldCallTool);
  const rejectionCases = evalCases.filter((testCase) => !testCase.shouldCallTool);

  if (generationCases.length < 3) {
    throw new Error("Expected at least 3 CFG-generation eval cases.");
  }

  if (rejectionCases.length < 1) {
    throw new Error("Expected at least 1 rejection eval case.");
  }

  for (const testCase of generationCases) {
    if (!testCase.expectedSqlIncludes?.length) {
      throw new Error(`Eval case ${testCase.id} needs SQL shape assertions.`);
    }
  }
}

async function main() {
  loadLocalEnv();
  validateEvalDefinitions();

  if (!process.env.OPENAI_API_KEY) {
    console.log(
      "Eval definitions are valid. Skipping live GPT-5 evals because OPENAI_API_KEY is not set.",
    );
    return;
  }

  const sqlGenerator = createOpenAISqlGenerator();
  const queryExecutor = hasEnvValues([
    "CLICKHOUSE_HOST",
    "CLICKHOUSE_USERNAME",
    "CLICKHOUSE_PASSWORD",
  ])
    ? createClickHouseExecutor()
    : null;

  console.log(`Running live evals with ${getOpenAIModel()}...`);

  for (const testCase of evalCases) {
    const result = await sqlGenerator.generateSql(testCase.prompt);

    if (!testCase.shouldCallTool) {
      if (result.status !== "rejected") {
        throw new Error(`${testCase.id}: expected no tool call.`);
      }

      console.log(`PASS ${testCase.id}: rejected`);
      continue;
    }

    if (result.status !== "tool_call") {
      throw new Error(`${testCase.id}: expected clickhouse_sql tool call.`);
    }

    const validationResult = validateSql(result.sql);

    if (!validationResult.valid) {
      throw new Error(`${testCase.id}: unsafe SQL: ${validationResult.reason}`);
    }

    for (const expectedSqlPart of testCase.expectedSqlIncludes ?? []) {
      if (!result.sql.includes(expectedSqlPart)) {
        throw new Error(
          `${testCase.id}: expected SQL to include ${expectedSqlPart}, got ${result.sql}`,
        );
      }
    }

    if (queryExecutor) {
      const rows = await queryExecutor.execute(validationResult.normalizedSql);

      if (rows.length === 0) {
        throw new Error(`${testCase.id}: ClickHouse returned no rows.`);
      }

      console.log(`PASS ${testCase.id}: ${rows.length} row(s)`);
      continue;
    }

    console.log(`PASS ${testCase.id}: generated SQL`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
