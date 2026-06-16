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
npm run test:watch
npm run typecheck
npm run build
npm run eval
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
CLICKHOUSE_DATABASE=nyc_taxi
CLICKHOUSE_TABLE=trips_small
```

`OPENAI_MODEL` defaults to `gpt-5-nano` in code. Use that for the cheapest
GPT-5 CFG-capable path first; switch to `gpt-5-mini` if live evals show routing
quality is not reliable enough.

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

`npm run eval` validates the eval definitions locally. Live GPT-5 eval execution
is intentionally skipped until `OPENAI_API_KEY` is available in Phase 3.
