import { examplePrompts } from "@/app/lib/examples";
import { executeSqlQuery, generateSqlForQuestion } from "@/app/lib/queryService";
import { loadLocalEnv } from "@/scripts/load-local-env";

async function main() {
  loadLocalEnv();

  for (const prompt of examplePrompts) {
    const proposal = await generateSqlForQuestion(prompt);

    if ("error" in proposal.cfg) {
      throw new Error(`${prompt}: ${proposal.cfg.error}`);
    }

    if ("rejected" in proposal.cfg) {
      throw new Error(`${prompt}: prompt was rejected`);
    }

    if ("error" in proposal.control) {
      throw new Error(`${prompt}: control SQL failed: ${proposal.control.error}`);
    }

    const response = await executeSqlQuery(prompt, proposal.cfg.sql);

    if ("error" in response) {
      throw new Error(`${prompt}: ${response.error}`);
    }

    if (response.rowCount === 0) {
      throw new Error(`${prompt}: query returned no rows`);
    }

    console.log(
      `PASS ${prompt}: cfg ${response.rowCount} row(s), control SQL generated, ${response.durationMs} ms`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
