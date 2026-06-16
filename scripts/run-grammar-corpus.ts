import { spawnSync } from "node:child_process";
import corpus from "@/app/lib/__fixtures__/grammar-corpus.json";
import { clickhouseSqlGrammar, isSqlAcceptedByGrammar } from "@/app/lib/grammar";

const guidanceCheck = spawnSync(
  "uvx",
  [
    "--from",
    "llguidance",
    "python",
    "-c",
    [
      "from llguidance import LLMatcher, grammar_from",
      "import sys",
      "grammar = sys.stdin.read()",
      "LLMatcher.validate_grammar(grammar_from('lark', grammar))",
    ].join("; "),
  ],
  {
    input: clickhouseSqlGrammar,
    encoding: "utf8",
  },
);

if (guidanceCheck.status !== 0) {
  console.error(guidanceCheck.stderr || guidanceCheck.stdout);
  throw new Error("LLGuidance failed to compile the ClickHouse SQL grammar.");
}

const failures = corpus.filter(({ input, should_parse }) => {
  return isSqlAcceptedByGrammar(input) !== should_parse;
});

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(
      `${failure.name}: expected should_parse=${failure.should_parse} for ${failure.input}`,
    );
  }

  throw new Error(`${failures.length} grammar corpus case(s) failed.`);
}

console.log(`LLGuidance compiled the grammar and ${corpus.length} corpus cases passed.`);
