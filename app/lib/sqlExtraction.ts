export type OpenAIToolCallLike = {
  type?: string;
  name?: string;
  input?: unknown;
};

export type OpenAIResponseLike = {
  output?: OpenAIToolCallLike[];
};

export type SqlExtractionResult =
  | {
      status: "tool_call";
      sql: string;
    }
  | {
      status: "rejected";
    };

export class SqlExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SqlExtractionError";
  }
}

/** Extracts generated SQL from the configured OpenAI custom tool call. */
export function extractSqlToolCall(
  response: OpenAIResponseLike,
  toolName = "clickhouse_sql",
): SqlExtractionResult {
  if (!Array.isArray(response.output)) {
    throw new SqlExtractionError("OpenAI response is missing output items.");
  }

  const toolCall = response.output.find((item) => {
    return item.type === "custom_tool_call" && item.name === toolName;
  });

  if (!toolCall) {
    return { status: "rejected" };
  }

  if (typeof toolCall.input !== "string" || toolCall.input.trim().length === 0) {
    throw new SqlExtractionError("OpenAI custom tool call did not include SQL text.");
  }

  return {
    status: "tool_call",
    sql: toolCall.input,
  };
}
