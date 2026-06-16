# CFG Taxi Demo

A small Next.js app that turns natural-language NYC taxi analytics questions
into GPT-5 CFG-constrained ClickHouse SQL, shows a non-CFG comparison query,
executes only the CFG query, and renders the results.

## Quick Start

```bash
npm ci
npm run dev
```

Open http://localhost:3000 and use the example prompt buttons.

## Useful Commands

```bash
npm run verify
npm run verify:live
```

`npm run verify` runs local checks. `npm run verify:live` uses `.env.local` to
validate OpenAI and ClickHouse end-to-end.

## Documentation

- Development setup: [DEVELOPMENT.md](./DEVELOPMENT.md)
- Deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Test / Eval guide: [EVAL.md](./EVAL.md)
- Technical spec: [system-design-tech-spec.md](./system-design-tech-spec.md)
