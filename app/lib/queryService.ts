import { createClickHouseExecutor, type QueryExecutor } from "@/app/lib/clickhouseClient";
import {
  createOpenAIControlSqlGenerator,
  createOpenAISqlGenerator,
  type ControlSqlGenerator,
  type SqlGenerator,
} from "@/app/lib/openaiClient";
import {
  rejectionMessage,
  type ExecuteSqlResponse,
  type GenerateSqlComparisonResponse,
  type GenerateSqlResponse,
  type QueryResponse,
} from "@/app/lib/queryTypes";
import { validateSql } from "@/app/lib/sqlSafety";

export type QueryServiceDependencies = {
  sqlGenerator: SqlGenerator;
  controlSqlGenerator: ControlSqlGenerator;
  queryExecutor: QueryExecutor;
  now?: () => number;
};

export type QueryRequestBody = {
  question?: unknown;
};

export type ExecuteSqlRequestBody = {
  question?: unknown;
  sql?: unknown;
};

export function createDefaultQueryDependencies(): QueryServiceDependencies {
  return {
    sqlGenerator: createOpenAISqlGenerator(),
    controlSqlGenerator: createOpenAIControlSqlGenerator(),
    queryExecutor: createClickHouseExecutor(),
  };
}

/** Generates supported ClickHouse SQL without executing it. */
export async function generateCfgSqlForQuestion(
  question: string,
  dependencies = createDefaultQueryDependencies(),
): Promise<GenerateSqlResponse> {
  if (question.trim().length === 0) {
    return {
      error: "Please enter a taxi analytics question.",
    };
  }

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

    return {
      question,
      sql: validationResult.normalizedSql,
    };
  } catch {
    return {
      error: "Unable to generate a supported read-only query.",
    };
  }
}

/** Generates CFG executable SQL and non-CFG comparison SQL in parallel. */
export async function generateSqlForQuestion(
  question: string,
  dependencies = createDefaultQueryDependencies(),
): Promise<GenerateSqlComparisonResponse> {
  if (question.trim().length === 0) {
    return {
      cfg: {
        error: "Please enter a taxi analytics question.",
      },
      control: {
        error: "Please enter a taxi analytics question.",
      },
    };
  }

  const [cfg, control] = await Promise.all([
    generateCfgSqlForQuestion(question, dependencies),
    generateControlSqlForQuestion(question, dependencies),
  ]);

  return {
    cfg,
    control,
  };
}

async function generateControlSqlForQuestion(
  question: string,
  dependencies: QueryServiceDependencies,
) {
  try {
    return await dependencies.controlSqlGenerator.generateControlSql(question);
  } catch {
    return {
      error: "Unable to generate comparison SQL.",
    };
  }
}

/** Executes already generated SQL after re-validating it server-side. */
export async function executeSqlQuery(
  question: string,
  sql: string,
  dependencies = createDefaultQueryDependencies(),
): Promise<ExecuteSqlResponse> {
  const now = dependencies.now ?? Date.now;
  const startedAt = now();
  const validationResult = validateSql(sql);

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
}

/** Handles the legacy one-step generate-and-execute path. */
export async function handleQueryRequest(
  question: string,
  dependencies = createDefaultQueryDependencies(),
): Promise<QueryResponse> {
  const proposal = await generateCfgSqlForQuestion(question, dependencies);

  if ("sql" in proposal) {
    return executeSqlQuery(proposal.question, proposal.sql, dependencies);
  }

  return proposal;
}
