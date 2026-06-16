import OpenAI from "openai";
import { clickhouseSqlGrammar } from "@/app/lib/grammar";
import { extractSqlToolCall, type SqlExtractionResult } from "@/app/lib/sqlExtraction";

export type SqlGenerator = {
  generateSql(question: string): Promise<SqlExtractionResult>;
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

/** Creates the GPT-5 CFG-backed SQL generator used by the query service. */
export function createOpenAISqlGenerator(): SqlGenerator {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = getOpenAIModel();

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
              "Only answer taxi trip analytics questions using the clickhouse_sql tool when the request fits the supported nyc_taxi.trips_small SQL surface. Otherwise, do not call the tool.",
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
              "Generate exactly one read-only ClickHouse SELECT query for nyc_taxi.trips_small. Use only allowed columns, aggregations, filters, grouping, ordering, and limits.",
            format: {
              type: "grammar",
              syntax: "lark",
              definition: clickhouseSqlGrammar,
            },
          },
        ],
        tool_choice: "auto",
        parallel_tool_calls: false,
        reasoning: { effort: "medium" },
      };

      const response = await client.responses.create(
        request as unknown as Parameters<typeof client.responses.create>[0],
      );

      return extractSqlToolCall(response as unknown as Parameters<typeof extractSqlToolCall>[0]);
    },
  };
}

export { extractSqlToolCall };
