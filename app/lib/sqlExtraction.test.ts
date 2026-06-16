import { describe, expect, it } from "vitest";
import { extractSqlToolCall, SqlExtractionError } from "@/app/lib/sqlExtraction";

describe("extractSqlToolCall", () => {
  it("extracts SQL from the clickhouse custom tool call", () => {
    const sql = "SELECT sum(total_amount) FROM nyc_taxi.trips_small;";

    expect(
      extractSqlToolCall({
        output: [
          { type: "message", input: "not the tool" },
          { type: "custom_tool_call", name: "clickhouse_sql", input: sql },
        ],
      }),
    ).toEqual({
      status: "tool_call",
      sql,
    });
  });

  it("returns rejection when the model does not call the tool", () => {
    expect(
      extractSqlToolCall({
        output: [{ type: "message", input: "I cannot answer that." }],
      }),
    ).toEqual({ status: "rejected" });
  });

  it.each([
    ["missing output", {}],
    ["non-string tool input", { output: [{ type: "custom_tool_call", name: "clickhouse_sql", input: 123 }] }],
    ["blank tool input", { output: [{ type: "custom_tool_call", name: "clickhouse_sql", input: "   " }] }],
  ])("throws for malformed response: %s", (_label, response) => {
    expect(() => extractSqlToolCall(response)).toThrow(SqlExtractionError);
  });
});
