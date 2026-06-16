import { createClickHouseExecutor, type QueryExecutor } from "@/app/lib/clickhouseClient";
import { createOpenAISqlGenerator, type SqlGenerator } from "@/app/lib/openaiClient";
import { rejectionMessage, type QueryResponse } from "@/app/lib/queryTypes";
import { validateSql } from "@/app/lib/sqlSafety";

export type QueryServiceDependencies = {
  sqlGenerator: SqlGenerator;
  queryExecutor: QueryExecutor;
  now?: () => number;
};

export type QueryRequestBody = {
  question?: unknown;
};

export function createDefaultQueryDependencies(): QueryServiceDependencies {
  return {
    sqlGenerator: createOpenAISqlGenerator(),
    queryExecutor: createClickHouseExecutor(),
  };
}

/** Handles a natural-language taxi analytics request through generation and execution. */
export async function handleQueryRequest(
  question: string,
  dependencies = createDefaultQueryDependencies(),
): Promise<QueryResponse> {
  if (question.trim().length === 0) {
    return {
      error: "Please enter a taxi analytics question.",
    };
  }

  const now = dependencies.now ?? Date.now;
  const startedAt = now();

  try {
    const generationResult = await dependencies.sqlGenerator.generateSql(question);

    if (generationResult.status === "rejected") {
      return {
        rejected: true,
        message: rejectionMessage,
      };
    }

    const validationResult = validateSql(generationResult.sql);

    if (!validationResult.valid) {
      return {
        error: "Unable to generate a supported read-only query.",
      };
    }

    try {
      const rows = await dependencies.queryExecutor.execute(
        validationResult.normalizedSql,
      );

      return {
        question,
        sql: validationResult.normalizedSql,
        rows,
        rowCount: rows.length,
        durationMs: Math.max(0, now() - startedAt),
      };
    } catch {
      return {
        error: "Unable to execute the generated query.",
      };
    }
  } catch {
    return {
      error: "Unable to generate a supported read-only query.",
    };
  }
}
