import { describe, expect, it } from "vitest";
import corpus from "@/app/lib/__fixtures__/grammar-corpus.json";
import { isSqlAcceptedByGrammar } from "@/app/lib/grammar";

describe("ClickHouse SQL grammar corpus", () => {
  it.each(corpus)("$name", ({ input, should_parse }) => {
    expect(isSqlAcceptedByGrammar(input)).toBe(should_parse);
  });
});
