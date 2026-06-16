import { describe, expect, it } from "vitest";
import {
  defaultOpenAIModel,
  getOpenAIModel,
  parseControlSqlResponse,
} from "@/app/lib/openaiClient";

describe("getOpenAIModel", () => {
  it("defaults to the cheapest GPT-5 model for constrained SQL generation", () => {
    expect(getOpenAIModel({})).toBe(defaultOpenAIModel);
    expect(defaultOpenAIModel).toBe("gpt-5-nano");
  });

  it("uses OPENAI_MODEL when configured", () => {
    expect(getOpenAIModel({ OPENAI_MODEL: "gpt-5-mini" })).toBe("gpt-5-mini");
  });

  it("falls back to the default when OPENAI_MODEL is blank", () => {
    expect(getOpenAIModel({ OPENAI_MODEL: "   " })).toBe(defaultOpenAIModel);
  });
});

describe("parseControlSqlResponse", () => {
  it("parses JSON SQL and optional notes", () => {
    expect(
      parseControlSqlResponse(
        JSON.stringify({
          sql: " SELECT min(pickup_datetime) FROM default.nyc_taxi; ",
          notes: "Uses the timestamp column.",
        }),
      ),
    ).toEqual({
      sql: "SELECT min(pickup_datetime) FROM default.nyc_taxi;",
      notes: "Uses the timestamp column.",
    });
  });

  it("throws when SQL is missing", () => {
    expect(() => parseControlSqlResponse(JSON.stringify({ notes: "no sql" }))).toThrow(
      "Control response missing sql.",
    );
  });
});
