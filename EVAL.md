# Evals

This project has three eval layers. They test different things, so run the one
that matches what you are trying to verify.

## Quick Commands

Run the local, no-credentials suite:

```bash
npm run verify
```

Run the live OpenAI + ClickHouse suite:

```bash
npm run verify:live
```

Run everything separately:

```bash
npm run test
npm run test:grammar
npm run test:clickhouse-corpus
npm run eval
npm run smoke:prompts
```

## What Each Eval Does

`npm run test`

Runs the Vitest unit and component tests. These cover SQL extraction, SQL safety
validation, route behavior, model configuration, table configuration, and UI
states.

`npm run test:grammar`

Compiles the ClickHouse SQL grammar with LLGuidance and runs the deterministic
accept/reject corpus. This does not call OpenAI or ClickHouse.

`npm run test:clickhouse-corpus`

Executes the positive grammar corpus queries against ClickHouse. This confirms
that grammar-accepted SQL is also valid against the live table.

`npm run eval`

Runs live GPT CFG-routing evals. The current cases check three in-scope prompts
and one rejection prompt:

- Sum total amount in the last 30 hours.
- Average tip amount by payment type.
- Top pickup neighborhoods by revenue.
- Reject an out-of-scope weather question.

`npm run smoke:prompts`

Runs the visible demo prompts end-to-end through generation, validation, and
ClickHouse execution.

## Credentials

Live evals require `.env.local` with:

```text
OPENAI_API_KEY= {ask me or use your own!}
OPENAI_MODEL=gpt-5-nano
CLICKHOUSE_HOST=https://s3rz1tfs5p.us-central1.gcp.clickhouse.cloud:8443
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD= {ask me}
CLICKHOUSE_DATABASE=default
CLICKHOUSE_TABLE=nyc_taxi
```
