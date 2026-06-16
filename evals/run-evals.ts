import { evalCases } from "./cases";

function validateEvalDefinitions() {
  const generationCases = evalCases.filter((testCase) => testCase.shouldCallTool);
  const rejectionCases = evalCases.filter((testCase) => !testCase.shouldCallTool);

  if (generationCases.length < 3) {
    throw new Error("Expected at least 3 CFG-generation eval cases.");
  }

  if (rejectionCases.length < 1) {
    throw new Error("Expected at least 1 rejection eval case.");
  }

  for (const testCase of generationCases) {
    if (!testCase.expectedSqlIncludes?.length) {
      throw new Error(`Eval case ${testCase.id} needs SQL shape assertions.`);
    }
  }
}

async function main() {
  validateEvalDefinitions();

  if (!process.env.OPENAI_API_KEY) {
    console.log(
      "Eval definitions are valid. Skipping live GPT-5 evals because OPENAI_API_KEY is not set.",
    );
    return;
  }

  throw new Error("Live GPT-5 eval execution is implemented in Phase 3.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
