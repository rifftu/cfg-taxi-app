import { describe, expect, it } from "vitest";
import { defaultOpenAIModel, getOpenAIModel } from "@/app/lib/openaiClient";

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
