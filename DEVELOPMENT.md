# Development

This project uses npm for local dependency management. The repository includes
`package-lock.json`, so a fresh clone should install the same dependency graph
with `npm ci`.

## Prerequisites

- Node.js 20.9 or newer. The current scaffold was verified with Node 24.13.0.
- npm, included with Node.js. The current scaffold was verified with npm 11.6.2.

No global package manager updates are required.

## Setup

```bash
npm ci
```

## Scripts

```bash
npm run dev
npm run lint
npm run test
npm run test:grammar
npm run test:clickhouse-corpus
npm run test:watch
npm run typecheck
npm run build
npm run eval
npm run smoke:prompts
npm run verify
npm run verify:live
```

## Environment

Copy `.env.example` to `.env.local` for local credentials when moving into live
integration work:

```text
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-nano
CLICKHOUSE_HOST=
CLICKHOUSE_USERNAME=
CLICKHOUSE_PASSWORD=
CLICKHOUSE_DATABASE=default
CLICKHOUSE_TABLE=nyc_taxi
```

`OPENAI_MODEL` defaults to `gpt-5-nano` in code. Use that for the cheapest
GPT-5 CFG-capable path first; switch to `gpt-5-mini` if live evals show routing
quality is not reliable enough.

The generated SQL table defaults to `nyc_taxi.trips_small`. When
`CLICKHOUSE_DATABASE` and `CLICKHOUSE_TABLE` are both set, live OpenAI grammar
generation and safety validation use `${CLICKHOUSE_DATABASE}.${CLICKHOUSE_TABLE}`
instead. This lets local credentials point at the actual ClickHouse sample table
without changing the offline corpus defaults.

## Phase 2 Dependency Notes

The Phase 2 plan calls for tests before implementation. Repo-local npm packages
cover the JavaScript/TypeScript side of that setup:

- Unit/component tests: `vitest`, `jsdom`, `@testing-library/react`,
  `@testing-library/jest-dom`, and `@testing-library/user-event`.
- Eval runner scaffolding: `tsx`.
- Future API integration modules: `openai` and `@clickhouse/client`.

Vitest is configured in `vitest.config.ts` with a jsdom environment, the `@/*`
path alias, and `app/test/setup.ts` for Testing Library matchers.

Grammar corpus validation runs through `npm run test:grammar`. The script uses
`uvx --from llguidance` to compile the grammar with LLGuidance without adding a
global install, then runs the checked-in accept/reject corpus.

## Validation

Before deploying, run the local verification suite:

```bash
npm run verify
```

When `.env.local` contains live OpenAI and ClickHouse credentials, run:

```bash
npm run verify:live
```

This is equivalent to:

```bash
npm run test:clickhouse-corpus
npm run eval
npm run smoke:prompts
```

`npm run test:clickhouse-corpus` executes the positive deterministic grammar
corpus against ClickHouse. `npm run eval` runs live GPT-5 CFG routing evals and
executes generated SQL when ClickHouse credentials are present. `npm run
smoke:prompts` runs the visible demo prompts through the split generation flow:
CFG SQL plus a non-CFG comparison SQL are generated first, then only the CFG SQL
is executed.
