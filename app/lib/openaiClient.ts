import OpenAI from "openai";
import { createClickHouseSqlGrammar } from "@/app/lib/grammar";
import {
  extractSqlToolCall,
  type OpenAIResponseLike,
  type SqlExtractionResult,
} from "@/app/lib/sqlExtraction";
import { getSqlTableIdentifier } from "@/app/lib/tableConfig";
import type { ControlSqlResponse } from "@/app/lib/queryTypes";

export type SqlGenerator = {
  generateSql(question: string): Promise<SqlExtractionResult>;
};

export type ControlSqlGenerator = {
  generateControlSql(question: string): Promise<ControlSqlResponse>;
};

export const defaultOpenAIModel = "gpt-5-nano";

type OpenAIModelEnv = {
  OPENAI_MODEL?: string;
};

export function getOpenAIModel(
  env: OpenAIModelEnv = { OPENAI_MODEL: process.env.OPENAI_MODEL },
) {
  return env.OPENAI_MODEL?.trim() || defaultOpenAIModel;
}

export function parseControlSqlResponse(text: string): ControlSqlResponse {
  const parsed = JSON.parse(text) as Partial<ControlSqlResponse>;

  if (typeof parsed.sql !== "string") {
    throw new Error("Control response missing sql.");
  }

  return {
    sql: parsed.sql.trim(),
    notes: typeof parsed.notes === "string" ? parsed.notes : undefined,
  };
}

/** Creates the GPT-5 CFG-backed SQL generator used by the query service. */
export function createOpenAISqlGenerator(): SqlGenerator {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = getOpenAIModel();
  const tableIdentifier = getSqlTableIdentifier();
  const grammar = createClickHouseSqlGrammar(tableIdentifier);

  return {
    async generateSql(question: string) {
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured.");
      }

      const client = new OpenAI({ apiKey });
      const request = {
        model,
        input: [
          {
            role: "system",
            content:
              `Only answer taxi trip analytics questions using the clickhouse_sql tool when the request fits the supported ${tableIdentifier} SQL surface. Otherwise, do not call the tool.`,
          },
          {
            role: "user",
            content: question,
          },
        ],
        tools: [
          {
            type: "custom",
            name: "clickhouse_sql",
            description:
              `Generate exactly one read-only ClickHouse SELECT query for ${tableIdentifier}. Use only allowed columns, aggregations, filters, grouping, ordering, and limits.`,
            format: {
              type: "grammar",
              syntax: "lark",
              definition: grammar,
            },
          },
        ],
        tool_choice: "auto",
        parallel_tool_calls: false,
        reasoning: { effort: "medium" },
      };

      console.info("[llm:input]", {
        model,
        tableIdentifier,
        input: request.input,
        toolName: "clickhouse_sql",
      });

      const response = await client.responses.create(
        request as unknown as Parameters<typeof client.responses.create>[0],
      );
      const responseForExtraction = response as unknown as OpenAIResponseLike;

      const extractionResult = extractSqlToolCall(responseForExtraction);

      console.info("[llm:output]", {
        model,
        tableIdentifier,
        output: responseForExtraction.output,
        extractionResult,
      });

      return extractionResult;
    },
  };
}

/** Creates the non-CFG SQL generator used for display-only comparison. */
export function createOpenAIControlSqlGenerator(): ControlSqlGenerator {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = getOpenAIModel();
  const tableIdentifier = getSqlTableIdentifier();

  return {
    async generateControlSql(question: string) {
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY is not configured.");
      }

      const client = new OpenAI({ apiKey });
      const request = {
        model,
        input: [
          {
            role: "system",
            content: [
              "You are a text-to-SQL assistant for ClickHouse.",
              "",
              `Table: ${tableIdentifier}`,
              "",
              "Columns:",
              "- pickup_datetime",
              "- dropoff_datetime",
              "- passenger_count",
              "- trip_distance",
              "- fare_amount",
              "- tip_amount",
              "- total_amount",
              "- payment_type",
              "- pickup_ntaname",
              "- dropoff_ntaname",
              "",
              "Return JSON only in this shape:",
              "{",
              '  "sql": "{SQL_QUERY}",',
              '  "notes": "brief explanation of assumptions"',
              "}",
              "",
              "Rules:",
              "- Generate one ClickHouse SQL query.",
              "- Prefer read-only SELECT queries.",
              "- Do not wrap the JSON in Markdown.",
            ].join("\n"),
          },
          {
            role: "user",
            content: question,
          },
        ],
      };

      console.info("[llm:control:input]", {
        model,
        tableIdentifier,
        input: request.input,
      });

      const response = await client.responses.create(
        request as unknown as Parameters<typeof client.responses.create>[0],
      );
      const outputText = extractResponseText(response);
      const parsed = parseControlSqlResponse(outputText);

      console.info("[llm:control:output]", {
        model,
        tableIdentifier,
        outputText,
        parsed,
      });

      return parsed;
    },
  };
}

function extractResponseText(response: unknown) {
  const candidate = response as {
    output_text?: unknown;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: unknown }>;
    }>;
  };

  if (typeof candidate.output_text === "string") {
    return candidate.output_text;
  }

  const text = candidate.output
    ?.flatMap((item) => item.content ?? [])
    .map((contentItem) => contentItem.text)
    .find((value): value is string => typeof value === "string");

  if (!text) {
    throw new Error("Control response missing text output.");
  }

  return text;
}

export { extractSqlToolCall };
